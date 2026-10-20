import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { fillTemplate, wrapEmail, EMAIL_TEMPLATES } from '@/lib/emailTemplates';
import { logAudit } from '@/lib/audit';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req, { params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  // Caller must be owner or admin of this collective
  const { data: callerMember } = await admin
    .from('collective_members')
    .select('role')
    .eq('collective_id', id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!callerMember || !['owner', 'admin'].includes(callerMember.role)) {
    return Response.json({ error: 'You do not have permission to invite members' }, { status: 403 });
  }

  const { email } = await req.json();
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return Response.json({ error: 'Email is required' }, { status: 400 });

  // Get collective name + inviter name
  const [collectiveRes, inviterRes] = await Promise.all([
    admin.from('collectives').select('name').eq('id', id).single(),
    admin.from('profiles').select('display_name').eq('id', user.id).single(),
  ]);
  const collectiveName = collectiveRes.data?.name ?? 'the collective';
  const inviterName    = inviterRes.data?.display_name ?? 'Someone';

  // Check if email belongs to an existing user
  const { data: existingUser } = await admin
    .from('profiles')
    .select('id, display_name')
    .eq('email', normalizedEmail)
    .single();

  if (existingUser?.id === user.id) {
    return Response.json({ error: 'You cannot invite yourself' }, { status: 400 });
  }

  // Check if already an active member
  if (existingUser) {
    const { data: alreadyMember } = await admin
      .from('collective_members')
      .select('status')
      .eq('collective_id', id)
      .eq('user_id', existingUser.id)
      .single();

    if (alreadyMember?.status === 'active') {
      return Response.json({ error: 'This person is already a member' }, { status: 409 });
    }
  }

  // Seat limit check — only for new invitations (not resends of existing pending ones)
  const TIER_SEAT_LIMITS = { small: 3, medium: 6, large: 9 };
  const { data: collective } = await admin.from('collectives').select('collective_tier').eq('id', id).single();
  const seatLimit = TIER_SEAT_LIMITS[collective?.collective_tier];

  if (seatLimit !== undefined) {
    const { data: existingPending } = await admin
      .from('collective_invitations')
      .select('id')
      .eq('collective_id', id)
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .maybeSingle();

    if (!existingPending) {
      const [{ count: activeCount }, { count: pendingCount }] = await Promise.all([
        admin.from('collective_members').select('*', { count: 'exact', head: true })
          .eq('collective_id', id).eq('status', 'active').neq('role', 'owner'),
        admin.from('collective_invitations').select('*', { count: 'exact', head: true })
          .eq('collective_id', id).eq('status', 'pending'),
      ]);
      const usedSeats = (activeCount ?? 0) + (pendingCount ?? 0);
      if (usedSeats >= seatLimit) {
        return Response.json({
          error: `Elérted a(z) ${seatLimit} férőhelyes korlátot (${usedSeats} foglalt hely). Bővítsd a csomagot, vagy távolíts el egy tagot.`,
          seat_limit_reached: true,
        }, { status: 403 });
      }
    }
  }

  // Cancel any existing pending invite for this email so we can issue a fresh token
  await admin.from('collective_invitations')
    .delete()
    .eq('collective_id', id)
    .eq('email', normalizedEmail)
    .eq('status', 'pending');

  const { data: invitation, error: insertErr } = await admin
    .from('collective_invitations')
    .insert({
      collective_id: id,
      invited_by:   user.id,
      email:        normalizedEmail,
      user_id:      existingUser?.id ?? null,
    })
    .select()
    .single();

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

  // Build email
  const isNewUser  = !existingUser;
  const acceptUrl  = `${APP_URL}/invitations/${invitation.token}`;
  const declineUrl = `${APP_URL}/invitations/${invitation.token}?decline=1`;

  const tpl     = EMAIL_TEMPLATES.collective_invitation;
  const subject = fillTemplate(tpl.subject, { inviter_name: inviterName, collective_name: collectiveName });

  const ctaLabel  = isNewUser ? 'Fiók létrehozása és csatlakozás' : 'Bejelentkezés és csatlakozás';
  const noteBlock = isNewUser
    ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#64748b;line-height:1.6;">
        Még nincs Epiteq fiókod — az elfogadás egy gyors regisztrációval indul.
        <strong>Ingyenes, bankkártya nélkül.</strong>
       </div>`
    : `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#166534;line-height:1.6;">
        Epiteq fiókod van — egyszerűen jelentkezz be a meghívó elfogadásához.
       </div>`;

  let bodyHtml = fillTemplate(tpl.bodyHtml, {
    inviter_name:    inviterName,
    collective_name: collectiveName,
    note_block:      noteBlock,
    cta_label:       ctaLabel,
    accept_url:      acceptUrl,
    decline_url:     declineUrl,
  });

  try {
    await sendEmail({ to: normalizedEmail, subject, html: wrapEmail(bodyHtml, subject) });
  } catch (emailErr) {
    // Don't fail the invite if email fails — invitation is already created
    console.error('Invitation email failed:', emailErr.message);
  }

  logAudit({
    entityId:   id,
    userId:     user.id,
    userName:   inviterName,
    action:     'Tag meghívva',
    targetType: 'collective_invitation',
    targetId:   invitation.id,
    targetName: normalizedEmail,
  });

  return Response.json({ invitation: { id: invitation.id, email: normalizedEmail, status: 'pending' } });
}

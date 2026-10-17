import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { fillTemplate, wrapEmail, EMAIL_TEMPLATES } from '@/lib/emailTemplates';

export async function POST(req, { params }) {
  const { token } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'You must be logged in to accept' }, { status: 401 });

  const admin = createAdminClient();

  const { data: inv, error: invErr } = await admin
    .from('collective_invitations')
    .select('id, email, status, collective_id, invited_by, user_id, collectives(name)')
    .eq('token', token)
    .single();

  if (invErr || !inv) return Response.json({ error: 'Invitation not found' }, { status: 404 });
  if (inv.status === 'retracted') return Response.json({ error: 'RETRACTED' }, { status: 410 });
  if (inv.status !== 'pending')   return Response.json({ error: `Invitation already ${inv.status}` }, { status: 409 });

  // Verify the logged-in user's email matches the invitation
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single();

  if (callerProfile?.email?.toLowerCase() !== inv.email.toLowerCase()) {
    return Response.json({ error: 'This invitation was sent to a different email address' }, { status: 403 });
  }

  // Check not already a member
  const { data: existing } = await admin
    .from('collective_members')
    .select('status')
    .eq('collective_id', inv.collective_id)
    .eq('user_id', user.id)
    .single();

  if (existing?.status === 'active') {
    // Mark accepted anyway and return success
    await admin.from('collective_invitations')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', inv.id);
    return Response.json({ ok: true });
  }

  // Add to collective
  const { error: memberErr } = await admin
    .from('collective_members')
    .upsert({ collective_id: inv.collective_id, user_id: user.id, role: 'contributor', status: 'active' },
             { onConflict: 'collective_id,user_id' });

  if (memberErr) return Response.json({ error: memberErr.message }, { status: 500 });

  // Mark invitation accepted
  await admin.from('collective_invitations')
    .update({ status: 'accepted', user_id: user.id, responded_at: new Date().toISOString() })
    .eq('id', inv.id);

  // Notify owner — fetch email via direct query to avoid ambiguous FK join
  const { data: ownerProfile } = await admin
    .from('profiles')
    .select('email')
    .eq('id', inv.invited_by)
    .single();
  const ownerEmail = ownerProfile?.email;
  if (ownerEmail) {
    const tpl = EMAIL_TEMPLATES.invitation_accepted;
    const vars = { invitee_email: inv.email, collective_name: inv.collectives?.name ?? '' };
    try {
      await sendEmail({
        to: ownerEmail,
        subject: fillTemplate(tpl.subject, vars),
        html: wrapEmail(fillTemplate(tpl.bodyHtml, vars)),
      });
    } catch { /* non-critical */ }
  }

  return Response.json({ ok: true, collective_id: inv.collective_id });
}

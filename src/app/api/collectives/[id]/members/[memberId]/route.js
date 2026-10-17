import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { fillTemplate, wrapEmail, EMAIL_TEMPLATES } from '@/lib/emailTemplates';

// PATCH  — block or unblock a member (owner only)
// DELETE — remove a member (owner can remove anyone; member can remove themselves)

export async function PATCH(req, { params }) {
  const { id, memberId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  const { data: callerMember } = await admin
    .from('collective_members')
    .select('role')
    .eq('collective_id', id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!['owner', 'admin'].includes(callerMember?.role)) {
    return Response.json({ error: 'Nincs jogosultsága' }, { status: 403 });
  }

  if (memberId === user.id) {
    return Response.json({ error: 'Saját magát nem tilthatja le' }, { status: 400 });
  }

  const { action } = await req.json(); // 'block' | 'unblock'
  if (!['block', 'unblock'].includes(action)) {
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  }

  const newStatus = action === 'block' ? 'blocked' : 'active';

  const { error: updateErr } = await admin
    .from('collective_members')
    .update({ status: newStatus })
    .eq('collective_id', id)
    .eq('user_id', memberId);

  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });

  // If blocking: immediately revoke their active context for this collective
  if (action === 'block') {
    await admin
      .from('profiles')
      .update({ active_collective_id: null })
      .eq('id', memberId)
      .eq('active_collective_id', id);
  }

  // Send notification email to the affected member (non-critical)
  const [memberProfileRes, collectiveRes, ownerProfileRes] = await Promise.all([
    admin.from('profiles').select('email').eq('id', memberId).single(),
    admin.from('collectives').select('name').eq('id', id).single(),
    admin.from('profiles').select('display_name').eq('id', user.id).single(),
  ]);
  const memberEmail    = memberProfileRes.data?.email;
  const collectiveName = collectiveRes.data?.name ?? '';
  const ownerName      = ownerProfileRes.data?.display_name ?? 'A tulajdonos';

  if (memberEmail && action === 'block') {
    const tpl = EMAIL_TEMPLATES.member_blocked;
    const vars = { owner_name: ownerName, collective_name: collectiveName };
    try {
      await sendEmail({
        to: memberEmail,
        subject: fillTemplate(tpl.subject, vars),
        html: wrapEmail(fillTemplate(tpl.bodyHtml, vars)),
      });
    } catch { /* non-critical */ }
  }

  return Response.json({ ok: true, status: newStatus });
}

export async function DELETE(req, { params }) {
  const { id, memberId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  const { data: callerMember } = await admin
    .from('collective_members')
    .select('role')
    .eq('collective_id', id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  const isSelf  = memberId === user.id;
  const isOwner = callerMember?.role === 'owner';

  if (!isSelf && !isOwner) {
    return Response.json({ error: 'Nincs jogosultsága eltávolítani ezt a tagot' }, { status: 403 });
  }

  // Prevent owner from removing themselves if they're the only owner
  if (isSelf && isOwner) {
    const { count } = await admin
      .from('collective_members')
      .select('*', { count: 'exact', head: true })
      .eq('collective_id', id)
      .eq('role', 'owner')
      .eq('status', 'active');
    if (count <= 1) return Response.json({ error: 'A kollektívának legalább egy tulajdonosnak kell maradnia' }, { status: 400 });
  }

  // Fetch names + emails needed for notifications before deleting
  const [memberProfileRes, collectiveRes, ownerProfileRes] = await Promise.all([
    admin.from('profiles').select('display_name, email').eq('id', memberId).single(),
    admin.from('collectives').select('name').eq('id', id).single(),
    admin.from('profiles').select('display_name, email').eq('id', user.id).single(),
  ]);

  const { error } = await admin
    .from('collective_members')
    .delete()
    .eq('collective_id', id)
    .eq('user_id', memberId);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const memberEmail    = memberProfileRes.data?.email;
  const memberName     = memberProfileRes.data?.display_name ?? memberEmail ?? 'Ismeretlen tag';
  const collectiveName = collectiveRes.data?.name ?? '';
  const ownerName      = ownerProfileRes.data?.display_name ?? 'A tulajdonos';
  const ownerEmail     = ownerProfileRes.data?.email;

  if (isSelf) {
    // Member left voluntarily — notify collective owner(s)
    const { data: owners } = await admin
      .from('collective_members')
      .select('user_id, profiles(email)')
      .eq('collective_id', id)
      .eq('role', 'owner')
      .eq('status', 'active');

    const tpl  = EMAIL_TEMPLATES.member_left;
    const vars = { member_name: memberName, collective_name: collectiveName };
    for (const o of (owners || [])) {
      const email = o.profiles?.email;
      if (email) {
        try { await sendEmail({ to: email, subject: fillTemplate(tpl.subject, vars), html: wrapEmail(fillTemplate(tpl.bodyHtml, vars)) }); }
        catch { /* non-critical */ }
      }
    }
  } else {
    // Owner removed member — notify the removed member
    if (memberEmail) {
      const tpl  = EMAIL_TEMPLATES.member_removed;
      const vars = { owner_name: ownerName, collective_name: collectiveName };
      try { await sendEmail({ to: memberEmail, subject: fillTemplate(tpl.subject, vars), html: wrapEmail(fillTemplate(tpl.bodyHtml, vars)) }); }
      catch { /* non-critical */ }
    }
  }

  return Response.json({ ok: true });
}

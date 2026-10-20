import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { fillTemplate, wrapEmail, EMAIL_TEMPLATES } from '@/lib/emailTemplates';
import { softDeleteUser } from '@/lib/softDeleteUser';

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('display_name, email, role')
    .eq('id', user.id)
    .single();

  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 });
  if (profile.role === 'superadmin') return Response.json({ error: 'Superadmin fiók nem törölhető' }, { status: 403 });

  const memberName = profile.display_name || profile.email || 'Ismeretlen felhasználó';

  // Notify collective owners before data is wiped
  const { data: memberships } = await admin
    .from('collective_members')
    .select('collective_id, collectives(name)')
    .eq('user_id', user.id)
    .eq('status', 'active');

  const tpl = EMAIL_TEMPLATES.member_account_deleted;
  for (const m of (memberships || [])) {
    const vars = { member_name: memberName, collective_name: m.collectives?.name ?? '' };
    const { data: owners } = await admin
      .from('collective_members')
      .select('profiles(email)')
      .eq('collective_id', m.collective_id)
      .eq('role', 'owner')
      .eq('status', 'active')
      .neq('user_id', user.id);
    for (const o of (owners || [])) {
      const ownerEmail = o.profiles?.email;
      if (ownerEmail) {
        try { await sendEmail({ to: ownerEmail, subject: fillTemplate(tpl.subject, vars), html: wrapEmail(fillTemplate(tpl.bodyHtml, vars)) }); }
        catch { /* non-critical */ }
      }
    }
  }

  await softDeleteUser(user.id);

  // Sign out the session
  await supabase.auth.signOut();

  return Response.json({ ok: true });
}

// PATCH — no longer needed (no grace period), kept for safety
export async function PATCH(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await request.json();
  if (!body.cancel_deletion) return Response.json({ error: 'Unsupported action' }, { status: 400 });

  const admin = createAdminClient();
  await admin.from('profiles').update({ scheduled_deletion_at: null }).eq('id', user.id);
  return Response.json({ ok: true });
}

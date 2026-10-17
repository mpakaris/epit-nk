import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { fillTemplate, wrapEmail, EMAIL_TEMPLATES } from '@/lib/emailTemplates';

// DELETE — user deletes their own account
// Notifies all collective owners the user belonged to, then bans + soft-deletes.
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

  // Find all collectives the user belongs to (as non-owner)
  const { data: memberships } = await admin
    .from('collective_members')
    .select('collective_id, role, collectives(name)')
    .eq('user_id', user.id)
    .eq('status', 'active');

  // Notify each collective's owner(s)
  const tpl = EMAIL_TEMPLATES.member_account_deleted;
  for (const m of (memberships || [])) {
    const collectiveName = m.collectives?.name ?? '';
    const vars = { member_name: memberName, collective_name: collectiveName };

    const { data: owners } = await admin
      .from('collective_members')
      .select('profiles(email)')
      .eq('collective_id', m.collective_id)
      .eq('role', 'owner')
      .eq('status', 'active')
      .neq('user_id', user.id); // don't email yourself if you own a collective

    for (const o of (owners || [])) {
      const ownerEmail = o.profiles?.email;
      if (ownerEmail) {
        try { await sendEmail({ to: ownerEmail, subject: fillTemplate(tpl.subject, vars), html: wrapEmail(fillTemplate(tpl.bodyHtml, vars)) }); }
        catch { /* non-critical */ }
      }
    }
  }

  // Soft-delete profile + ban auth user (prevents login)
  await admin.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', user.id);
  await admin.auth.admin.updateUserById(user.id, { ban_duration: '876000h' });

  return Response.json({ ok: true });
}

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function assertSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role === 'superadmin' ? admin : null;
}

// GET — list all users (email, name, tier, created_at)
export async function GET() {
  const admin = await assertSuperAdmin();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 403 });

  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, email, display_name, subscription_tier, is_subscription_premium, created_at')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ users: profiles ?? [] });
}

// DELETE — total recall: wipe every trace of a user
export async function DELETE(req) {
  const admin = await assertSuperAdmin();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 403 });

  const { email } = await req.json();
  if (!email?.trim()) return Response.json({ error: 'email required' }, { status: 400 });

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (!profile) return Response.json({ error: `No user found for ${email}` }, { status: 404 });

  const uid = profile.id;
  const errors = [];

  const attempt = async (label, fn) => {
    try { await fn(); }
    catch (e) { errors.push(`${label}: ${e.message}`); }
  };

  // Personal content
  await attempt('projects',  () => admin.from('projects').delete().eq('owner_id', uid));
  await attempt('quotes',    () => admin.from('quotes').delete().eq('owner_id', uid));
  await attempt('surveys',   () => admin.from('surveys').delete().eq('owner_id', uid));
  await attempt('clients',   () => admin.from('clients').delete().eq('owner_id', uid));

  // Owned collectives (cascades members + invitations)
  const { data: ownedMemberships } = await admin
    .from('collective_members')
    .select('collective_id')
    .eq('user_id', uid)
    .eq('role', 'owner');
  const collectiveIds = (ownedMemberships || []).map(m => m.collective_id);
  if (collectiveIds.length > 0) {
    await attempt('collectives', () => admin.from('collectives').delete().in('id', collectiveIds));
  }

  // Memberships in other collectives + any remaining invitations
  await attempt('collective_members',     () => admin.from('collective_members').delete().eq('user_id', uid));
  await attempt('collective_invitations', () => admin.from('collective_invitations').delete().eq('user_id', uid));

  // Billing
  await attempt('subscriptions', () => admin.from('subscriptions').delete().eq('user_id', uid));
  await attempt('trial_emails',  () => admin.from('trial_emails').delete().eq('email', email.trim().toLowerCase()));

  // Audit log
  await attempt('audit_logs', () => admin.from('audit_logs').delete().eq('user_id', uid));

  // Profile row
  await attempt('profiles', () => admin.from('profiles').delete().eq('id', uid));

  // Auth user (must come last)
  await attempt('auth.users', async () => {
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) throw error;
  });

  console.log(`[total-recall] ${email} (${uid}) wiped. Errors: ${errors.length}`);

  return Response.json({
    ok: true,
    email,
    userId: uid,
    warnings: errors.length > 0 ? errors : undefined,
  });
}

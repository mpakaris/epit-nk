import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET  — list collectives the caller belongs to (with members)
// POST — create a new collective (Premium required)

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  const { data: memberships } = await admin
    .from('collective_members')
    .select('collective_id, role, status, collectives(id, name, created_at)')
    .eq('user_id', user.id)
    .eq('status', 'active');

  const collectiveIds = (memberships || []).map(m => m.collective_id);
  if (collectiveIds.length === 0) return Response.json({ collectives: [] });

  // Fetch all members for those collectives
  const { data: allMembers } = await admin
    .from('collective_members')
    .select('collective_id, user_id, role, status, profiles(id, display_name, email)')
    .in('collective_id', collectiveIds);

  const collectives = (memberships || []).map(m => ({
    id: m.collective_id,
    name: m.collectives?.name,
    created_at: m.collectives?.created_at,
    my_role: m.role,
    members: (allMembers || [])
      .filter(mb => mb.collective_id === m.collective_id)
      .map(mb => ({
        user_id: mb.user_id,
        role: mb.role,
        status: mb.status,
        display_name: mb.profiles?.display_name || mb.profiles?.email || mb.user_id,
        email: mb.profiles?.email,
      })),
  }));

  return Response.json({ collectives });
}

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('is_subscription_premium, role').eq('id', user.id).single();

  const isSuperAdmin = profile?.role === 'superadmin';
  if (!isSuperAdmin && !profile?.is_subscription_premium) {
    return Response.json({ error: 'PREMIUM_REQUIRED' }, { status: 403 });
  }

  const { name } = await req.json();
  if (!name?.trim()) return Response.json({ error: 'A kollektíva neve kötelező' }, { status: 400 });

  const { data: collective, error: createErr } = await admin
    .from('collectives')
    .insert({ name: name.trim() })
    .select()
    .single();

  if (createErr) return Response.json({ error: createErr.message }, { status: 500 });

  // Add creator as owner
  await admin.from('collective_members').insert({
    collective_id: collective.id,
    user_id: user.id,
    role: 'owner',
    status: 'active',
  });

  return Response.json({ collective });
}

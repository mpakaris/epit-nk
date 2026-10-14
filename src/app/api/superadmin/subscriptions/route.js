import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireSuperadmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (caller?.role !== 'superadmin') return { error: 'Forbidden', status: 403 };
  return { admin };
}

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { admin } = auth;

  const [profilesRes, authRes] = await Promise.all([
    admin.from('profiles')
      .select('id, display_name, email, role, is_subscription_premium, created_at')
      .order('display_name'),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (profilesRes.error) return Response.json({ error: profilesRes.error.message }, { status: 500 });

  const authMap = {};
  for (const u of (authRes.data?.users ?? [])) {
    authMap[u.id] = u.last_sign_in_at ?? null;
  }

  const users = profilesRes.data.map(p => ({
    ...p,
    last_sign_in_at: authMap[p.id] ?? null,
  }));

  return Response.json({ users });
}

export async function PATCH(request) {
  const auth = await requireSuperadmin();
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { admin } = auth;

  const body = await request.json();
  const { userId, is_subscription_premium } = body;

  if (!userId || typeof is_subscription_premium !== 'boolean') {
    return Response.json({ error: 'userId and is_subscription_premium are required' }, { status: 400 });
  }

  const { error } = await admin
    .from('profiles')
    .update({ is_subscription_premium })
    .eq('id', userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

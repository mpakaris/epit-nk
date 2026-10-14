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

  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, display_name, email, is_subscription_premium, user_websites(id, slug, status, published_at, trade_id)')
    .order('display_name');

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const withWebsite = profiles.filter(p => p.user_websites?.length > 0).map(p => ({
    id: p.id,
    display_name: p.display_name,
    email: p.email,
    is_subscription_premium: p.is_subscription_premium ?? false,
    website: p.user_websites[0],
  }));

  return Response.json({ users: withWebsite });
}

export async function PATCH(request) {
  const auth = await requireSuperadmin();
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { admin } = auth;

  const body = await request.json();
  const { userId, is_subscription_premium } = body;
  if (!userId || typeof is_subscription_premium !== 'boolean') {
    return Response.json({ error: 'userId and is_subscription_premium required' }, { status: 400 });
  }

  const { error } = await admin
    .from('profiles')
    .update({ is_subscription_premium })
    .eq('id', userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

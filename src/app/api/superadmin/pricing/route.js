import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function requireSuperadmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: caller } = await admin.from('profiles').select('role, display_name').eq('id', user.id).single();
  if (caller?.role !== 'superadmin') return { error: 'Forbidden', status: 403 };
  return { admin, user, caller };
}

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.admin
    .from('pricing_config')
    .select('*')
    .order('key');

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ config: data });
}

export async function PATCH(request) {
  const auth = await requireSuperadmin();
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { key, value } = await request.json();
  if (!key || value === undefined || value === null || isNaN(Number(value))) {
    return Response.json({ error: 'key and numeric value required' }, { status: 400 });
  }

  const { error } = await auth.admin
    .from('pricing_config')
    .update({ value: Number(value), updated_at: new Date().toISOString() })
    .eq('key', key);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  logAudit({ userId: auth.user.id, userName: auth.caller?.display_name || '', action: 'Pricing config updated', targetType: 'admin', targetName: key, details: { key, value: Number(value) } });
  return Response.json({ ok: true });
}

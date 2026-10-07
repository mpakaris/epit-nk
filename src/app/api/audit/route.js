import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

// POST — any authenticated user records an action (entity + identity derived server-side)
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles').select('display_name, entity_id').eq('id', user.id).single();

  const { action, entityId, targetType, targetId, targetName, details } = await request.json();
  if (!action) return Response.json({ error: 'action required' }, { status: 400 });

  await logAudit({
    entityId:   entityId   ?? profile?.entity_id ?? null,
    userId:     user.id,
    userName:   profile?.display_name || user.email,
    action,
    targetType: targetType || null,
    targetId:   targetId   || null,
    targetName: targetName || null,
    details:    details    || null,
  });

  return Response.json({ success: true });
}

// GET — superadmin reads paginated logs
export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'superadmin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const entityId = searchParams.get('entityId') || null;
  const action   = searchParams.get('action')   || null;
  const from     = searchParams.get('from')     || null;
  const to       = searchParams.get('to')       || null;
  const limit    = Math.min(Number(searchParams.get('limit') || 50), 200);
  const offset   = Number(searchParams.get('offset') || 0);

  let q = admin
    .from('audit_logs')
    .select('*, entity:entities(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (entityId) q = q.eq('entity_id', entityId);
  if (action)   q = q.eq('action', action);
  if (from)     q = q.gte('created_at', from);
  if (to)       q = q.lte('created_at', to);

  const { data: logs, count, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ logs: logs || [], total: count ?? 0 });
}

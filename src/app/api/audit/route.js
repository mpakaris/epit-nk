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
  const userName = searchParams.get('userName') || null;
  const action   = searchParams.get('action')   || null;
  const from     = searchParams.get('from')     || null;
  const to       = searchParams.get('to')       || null;
  const limit    = Math.min(Number(searchParams.get('limit') || 50), 200);
  const offset   = Number(searchParams.get('offset') || 0);
  const channel  = searchParams.get('channel') || null;  // 'whatsapp' for WA-only filter

  let q = admin
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (entityId) q = q.eq('entity_id', entityId);
  if (userName) q = q.ilike('user_name', `%${userName}%`);
  if (action)   q = q.eq('action', action);
  if (from)     q = q.gte('created_at', from);
  if (to)       q = q.lte('created_at', to);
  if (channel)  q = q.eq('details->>channel', channel);

  const { data: logs, count, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Resolve workspace context from details.workspace_id
  // (entity_id is always null now due to legacy FK constraint workaround)
  const workspaceIds = [...new Set((logs || [])
    .map(l => l.details?.workspace_id)
    .filter(Boolean))];
  let collectiveMap = {};
  if (workspaceIds.length > 0) {
    const { data: cols } = await admin
      .from('collectives')
      .select('id, name')
      .in('id', workspaceIds);
    for (const c of cols || []) collectiveMap[c.id] = c.name;
  }

  const enriched = (logs || []).map(log => {
    const wsId  = log.details?.workspace_id || null;
    const cName = wsId ? collectiveMap[wsId] : null;
    return {
      ...log,
      workspace: !wsId
        ? { type: 'unknown', name: null }
        : cName
          ? { type: 'collective', name: cName }
          : { type: 'personal', name: null },
    };
  });

  return Response.json({ logs: enriched, total: count ?? 0 });
}

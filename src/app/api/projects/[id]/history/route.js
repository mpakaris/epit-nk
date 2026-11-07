import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request, { params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: project } = await admin
    .from('projects')
    .select('owner_id, created_by, collective_id')
    .eq('id', id)
    .is('deleted_at', null).single();
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  const isSuperAdmin = profile?.role === 'superadmin';
  const isOwner      = project.owner_id === user.id || project.created_by === user.id;

  let isMember = false;
  if (!isOwner && !isSuperAdmin && project.collective_id) {
    const { data: mem } = await admin
      .from('collective_members')
      .select('role')
      .eq('collective_id', project.collective_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    isMember = !!mem;
  }

  if (!isOwner && !isSuperAdmin && !isMember)
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const url    = new URL(request.url);
  const limit  = Math.min(parseInt(url.searchParams.get('limit')  || '10', 10), 50);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0',  10), 0);

  const { data: history, count } = await admin
    .from('audit_logs')
    .select('id, user_name, action, details, created_at', { count: 'exact' })
    .eq('target_type', 'project')
    .eq('target_id', id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return Response.json({ history: history || [], total: count ?? 0 });
}

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getCtx(projectId) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, entity_id').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };
  if (!['admin', 'superadmin'].includes(profile.role)) return { err: 'Forbidden', status: 403 };
  const { data: project } = await admin.from('projects').select('id, entity_id').eq('id', projectId).single();
  if (!project) return { err: 'Project not found', status: 404 };
  if (profile.role !== 'superadmin' && project.entity_id !== profile.entity_id) return { err: 'Forbidden', status: 403 };
  return { profile, admin, project };
}

export async function PATCH(request, { params }) {
  const { id: projectId, roomId } = await params;
  const ctx = await getCtx(projectId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const body = await request.json();
  const allowed = ['name', 'size_m2', 'work_types', 'description', 'quoted_amount_net', 'sort_order'];
  const update = {};
  for (const k of allowed) if (k in body) update[k] = body[k];
  if ('name' in update) {
    update.name = update.name?.trim();
    if (!update.name) return Response.json({ error: 'Név kötelező' }, { status: 400 });
  }
  if ('size_m2' in update) update.size_m2 = update.size_m2 != null && update.size_m2 !== '' ? Number(update.size_m2) : null;
  if ('quoted_amount_net' in update) update.quoted_amount_net = update.quoted_amount_net != null && update.quoted_amount_net !== '' ? Number(update.quoted_amount_net) : null;
  if ('work_types' in update && !Array.isArray(update.work_types)) update.work_types = [];

  const { data, error } = await ctx.admin
    .from('project_rooms')
    .update(update)
    .eq('id', roomId)
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ room: data });
}

export async function DELETE(request, { params }) {
  const { id: projectId, roomId } = await params;
  const ctx = await getCtx(projectId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { error } = await ctx.admin
    .from('project_rooms')
    .delete()
    .eq('id', roomId)
    .eq('project_id', projectId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}

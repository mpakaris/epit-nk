import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function getCtx(projectId, userId) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role').eq('id', userId).single();
  if (!profile) return { err: 'Forbidden', status: 403 };
  const { data: project } = await admin.from('projects').select('id, owner_id, created_by, collective_id').eq('id', projectId).single();
  if (!project) return { err: 'Project not found', status: 404 };

  const isSuperAdmin = profile.role === 'superadmin';
  const isOwner = project.owner_id === userId || project.created_by === userId;

  let isCollectiveMember = false;
  if (!isSuperAdmin && !isOwner && project.collective_id) {
    const { data: mem } = await admin.from('collective_members')
      .select('user_id').eq('collective_id', project.collective_id).eq('user_id', userId).eq('status', 'active').maybeSingle();
    isCollectiveMember = !!mem;
  }

  if (!isSuperAdmin && !isOwner && !isCollectiveMember) return { err: 'Forbidden', status: 403 };
  return { profile, admin, project };
}

export async function PATCH(request, { params }) {
  const { id: projectId, roomId } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const ctx = await getCtx(projectId, user.id);
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

  const { data, error: updateErr } = await ctx.admin
    .from('project_rooms').update(update).eq('id', roomId).eq('project_id', projectId).select().single();

  if (updateErr) return Response.json({ error: updateErr.message }, { status: 400 });

  logAudit({
    entityId: ctx.project.collective_id || ctx.project.owner_id,
    userId: user.id,
    userName: ctx.profile.display_name || user.email,
    action: 'Helyiség módosítva',
    targetType: 'project_room',
    targetId: roomId,
    targetName: data.name,
    details: { project_id: projectId },
  });

  return Response.json({ room: data });
}

export async function DELETE(request, { params }) {
  const { id: projectId, roomId } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const ctx = await getCtx(projectId, user.id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  // Unassign all related entries before deleting the room (move to general/unassigned)
  await Promise.all([
    ctx.admin.from('invoices').update({ room_id: null }).eq('room_id', roomId),
    ctx.admin.from('labour_entries').update({ room_id: null }).eq('room_id', roomId),
    ctx.admin.from('invoice_splits').update({ room_id: null }).eq('room_id', roomId),
  ]);

  const { error: deleteErr } = await ctx.admin
    .from('project_rooms').delete().eq('id', roomId).eq('project_id', projectId);

  if (deleteErr) return Response.json({ error: deleteErr.message }, { status: 400 });

  logAudit({
    entityId: ctx.project.collective_id || ctx.project.owner_id,
    userId: user.id,
    userName: ctx.profile.display_name || user.email,
    action: 'Helyiség törölve',
    targetType: 'project_room',
    targetId: roomId,
    targetName: roomId,
    details: { project_id: projectId },
  });

  return Response.json({ success: true });
}

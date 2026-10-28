import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { hasPendingTransfer } from '@/lib/transferLock';

async function getCallerAndProject(id) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, active_collective_id, display_name')
    .eq('id', user.id)
    .single();
  if (!profile) return { err: 'Forbidden', status: 403 };

  const { data: project } = await admin
    .from('projects')
    .select('owner_id, collective_id, name, created_by')
    .eq('id', id)
    .single();
  if (!project) return { err: 'Not found', status: 404 };

  const isSuperAdmin = profile.role === 'superadmin';
  const isOwner      = project.owner_id === user.id || project.created_by === user.id;

  // Superadmin: always allowed
  if (isSuperAdmin) return { user, profile, admin, project };

  // Owner: always allowed
  if (isOwner) return { user, profile, admin, project };

  // Collective member: allowed if project is in a collective the user belongs to
  if (project.collective_id) {
    const { data: mem } = await admin
      .from('collective_members')
      .select('role')
      .eq('collective_id', project.collective_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();
    if (mem) return { user, profile, admin, project, memberRole: mem.role };
  }

  return { err: 'Forbidden', status: 403 };
}

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: project } = await admin.from('projects').select('*').eq('id', id).single();
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: profile } = await admin.from('profiles').select('role, active_collective_id').eq('id', user.id).single();
  const isSuperAdmin = profile?.role === 'superadmin';
  const isOwner      = project.owner_id === user.id || project.created_by === user.id;
  let allowed = isSuperAdmin || isOwner;

  if (!allowed && project.collective_id) {
    const { data: mem } = await admin
      .from('collective_members')
      .select('collective_id')
      .eq('collective_id', project.collective_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();
    allowed = !!mem;
  }
  if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const [memberRes, clientRes, usersRes] = await Promise.all([
    admin.from('project_members').select('user_id').eq('project_id', id),
    project.client_id
      ? admin.from('clients').select('*').eq('id', project.client_id).single()
      : Promise.resolve({ data: null }),
    project.collective_id
      ? admin.from('collective_members').select('user_id, role, profiles(id, display_name, email, role)').eq('collective_id', project.collective_id).eq('status', 'active')
      : admin.from('profiles').select('id, display_name, email, role').eq('id', user.id),
  ]);

  const collectiveUsers = project.collective_id
    ? (usersRes.data || []).map(m => ({ ...m.profiles, collective_role: m.role }))
    : (usersRes.data || []);

  return Response.json({
    project: { ...project, members: (memberRes.data || []).map(m => m.user_id) },
    client: clientRes.data || null,
    entityUsers: collectiveUsers,
  });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndProject(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const fields = await request.json();
  const isOwner          = ctx.project.owner_id === ctx.user.id || ctx.project.created_by === ctx.user.id;
  const isSuperAdmin     = ctx.profile.role === 'superadmin';
  const isKollektivOwner = ctx.memberRole === 'owner' || ctx.memberRole === 'admin';

  if (!isOwner && !isSuperAdmin && !isKollektivOwner)
    return Response.json({ error: 'Csak a tulajdonos módosíthatja a projektet.' }, { status: 403 });

  if (!isSuperAdmin && !isOwner && await hasPendingTransfer('project', id))
    return Response.json({ error: 'Ez a dokumentum átadás alatt áll, ezért nem módosítható.' }, { status: 423 });

  const allowed = ['name', 'description', 'start_date', 'end_date', 'client_id', 'closed_at',
                   ...(isOwner || isSuperAdmin || isKollektivOwner ? ['collective_id'] : [])];
  const update = {};
  for (const k of allowed) if (k in fields) update[k] = fields[k];
  update.updated_at      = new Date().toISOString();
  update.updated_by_name = ctx.profile.display_name || ctx.user.email;

  const { data, error } = await ctx.admin.from('projects').update(update).eq('id', id).select().single();
  if (error) {
    if (error.code === '23503') return Response.json({ error: 'A kiválasztott ügyfél már nem létezik.' }, { status: 400 });
    return Response.json({ error: error.message }, { status: 400 });
  }

  logAudit({
    entityId: ctx.project.collective_id || ctx.user.id,
    userId: ctx.user.id,
    userName: ctx.profile.display_name || ctx.user.email,
    action: 'Projekt módosítva',
    targetType: 'project',
    targetId: id,
    targetName: data.name,
  });
  return Response.json({ project: data });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndProject(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const isOwner          = ctx.project.owner_id === ctx.user.id || ctx.project.created_by === ctx.user.id;
  const isSuperAdmin     = ctx.profile.role === 'superadmin';
  const isKollektivOwner = ctx.memberRole === 'owner' || ctx.memberRole === 'admin';
  if (!isOwner && !isSuperAdmin && !isKollektivOwner)
    return Response.json({ error: 'Csak a tulajdonos törölheti a projektet.' }, { status: 403 });

  if (!isSuperAdmin && await hasPendingTransfer('project', id))
    return Response.json({ error: 'Ez a dokumentum átadás alatt áll, ezért nem módosítható.' }, { status: 423 });

  const { error } = await ctx.admin.from('projects')
    .update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  logAudit({
    entityId: ctx.project.collective_id || ctx.user.id,
    userId: ctx.user.id,
    userName: ctx.profile.display_name || ctx.user.email,
    action: 'Projekt törölve',
    targetType: 'project',
    targetId: id,
    targetName: ctx.project.name,
  });
  return Response.json({ success: true });
}

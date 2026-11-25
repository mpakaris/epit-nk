import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { checkSectionLimit } from '@/lib/subscriptionLimits';
import { checkCollectiveStatus } from '@/lib/collectiveGuard';

async function getCtx(projectId, userId) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, display_name, is_subscription_premium, subscription_tier, trial_ends_at').eq('id', userId).single();
  if (!profile) return { err: 'Forbidden', status: 403 };
  const { data: project } = await admin.from('projects').select('id, owner_id, created_by, collective_id, is_read_only').eq('id', projectId).is('deleted_at', null).single();
  if (!project) return { err: 'Project not found', status: 404 };

  const isSuperAdmin = profile.role === 'superadmin';
  const isOwner = project.owner_id === userId || project.created_by === userId;

  // Collective member check
  let isCollectiveMember = false;
  if (!isSuperAdmin && !isOwner && project.collective_id) {
    const { data: mem } = await admin.from('collective_members')
      .select('user_id').eq('collective_id', project.collective_id).eq('user_id', userId).eq('status', 'active').maybeSingle();
    isCollectiveMember = !!mem;
  }

  if (!isSuperAdmin && !isOwner && !isCollectiveMember) return { err: 'Forbidden', status: 403 };
  return { profile, admin, project };
}

export async function GET(request, { params }) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const ctx = await getCtx(projectId, user.id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { data: rooms, error: roomsErr } = await ctx.admin
    .from('project_rooms').select('*').eq('project_id', projectId)
    .order('sort_order').order('created_at');

  if (roomsErr) return Response.json({ error: roomsErr.message }, { status: 500 });
  return Response.json({ rooms: rooms || [] });
}

export async function POST(request, { params }) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const ctx = await getCtx(projectId, user.id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  if (ctx.profile.role !== 'superadmin' && ctx.project.is_read_only)
    return Response.json({ error: 'Ez a dokumentum csak olvasható. Prémium csomagra váltva újra szerkeszthetővé válik.', read_only: true }, { status: 403 });

  const statusBlocked = await checkCollectiveStatus(ctx.admin, ctx.project.collective_id);
  if (statusBlocked) return statusBlocked;

  const secCheck = await checkSectionLimit(ctx.admin, projectId, 'project_rooms', 'project_id', ctx.profile, !!ctx.project.collective_id);
  if (!secCheck.allowed)
    return Response.json({ error: `Bázis csomagban projekthez maximum ${secCheck.limit} helyiség adható hozzá. Váltj Prémiumra a korlátlan használathoz.` }, { status: 403 });

  const body = await request.json();
  const { name, size_m2, work_types, description, quoted_amount_net, sort_order, source_section_id } = body;
  if (!name?.trim()) return Response.json({ error: 'A helyiség neve kötelező' }, { status: 400 });

  const { data: room, error: insertErr } = await ctx.admin.from('project_rooms').insert([{
    project_id: projectId,
    name: name.trim(),
    size_m2: size_m2 != null && size_m2 !== '' ? Number(size_m2) : null,
    work_types: Array.isArray(work_types) ? work_types : [],
    description: description?.trim() || null,
    quoted_amount_net: quoted_amount_net != null && quoted_amount_net !== '' ? Number(quoted_amount_net) : null,
    sort_order: sort_order ?? 0,
    source_section_id: source_section_id || null,
  }]).select().single();

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

  logAudit({
    entityId: ctx.project.collective_id || ctx.project.owner_id,
    userId: user.id,
    userName: ctx.profile.display_name || user.email,
    action: 'room.created',
    targetType: 'project_room',
    targetId: room.id,
    targetName: room.name,
    details: { project_id: projectId },
  });

  return Response.json({ room }, { status: 201 });
}

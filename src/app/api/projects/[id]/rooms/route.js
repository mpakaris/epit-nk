import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getCtx(projectId) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, entity_id').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };
  const { data: project } = await admin.from('projects').select('id, entity_id').eq('id', projectId).single();
  if (!project) return { err: 'Project not found', status: 404 };
  if (profile.role !== 'superadmin' && project.entity_id !== profile.entity_id) return { err: 'Forbidden', status: 403 };
  return { profile, admin, project };
}

export async function GET(request, { params }) {
  const { id: projectId } = await params;
  const ctx = await getCtx(projectId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { data: rooms, error } = await ctx.admin
    .from('project_rooms')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')
    .order('created_at');

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ rooms: rooms || [] });
}

export async function POST(request, { params }) {
  const { id: projectId } = await params;
  const ctx = await getCtx(projectId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  if (!['admin', 'superadmin'].includes(ctx.profile.role))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { name, size_m2, work_types, description, quoted_amount_net, sort_order, source_section_id } = body;
  if (!name?.trim()) return Response.json({ error: 'A helyiség neve kötelező' }, { status: 400 });

  const { data: room, error } = await ctx.admin.from('project_rooms').insert([{
    project_id: projectId,
    entity_id: ctx.project.entity_id,
    name: name.trim(),
    size_m2: size_m2 != null && size_m2 !== '' ? Number(size_m2) : null,
    work_types: Array.isArray(work_types) ? work_types : [],
    description: description?.trim() || null,
    quoted_amount_net: quoted_amount_net != null && quoted_amount_net !== '' ? Number(quoted_amount_net) : null,
    sort_order: sort_order ?? 0,
    source_section_id: source_section_id || null,
  }]).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ room }, { status: 201 });
}

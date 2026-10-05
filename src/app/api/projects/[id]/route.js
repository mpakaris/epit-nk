import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getCallerAndProject(request, id) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, entity_id').eq('id', user.id).single();
  if (!profile || !['admin', 'superadmin'].includes(profile.role))
    return { err: 'Forbidden', status: 403 };

  const { data: project } = await admin.from('projects').select('entity_id').eq('id', id).single();
  if (!project) return { err: 'Not found', status: 404 };

  if (profile.role === 'admin' && project.entity_id !== profile.entity_id)
    return { err: 'Forbidden', status: 403 };

  return { user, profile, admin, project };
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndProject(request, id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const fields = await request.json();
  const allowed = ['name', 'description', 'start_date', 'end_date', 'client_id'];
  const update = {};
  for (const k of allowed) if (k in fields) update[k] = fields[k];

  const { data, error } = await ctx.admin.from('projects').update(update).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ project: data });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndProject(request, id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { error } = await ctx.admin.from('projects').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}

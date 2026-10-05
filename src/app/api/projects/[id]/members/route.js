import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PUT(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, entity_id').eq('id', user.id).single();
  if (!profile || !['admin', 'superadmin'].includes(profile.role))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { data: project } = await admin.from('projects').select('entity_id').eq('id', id).single();
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 });
  if (profile.role === 'admin' && project.entity_id !== profile.entity_id)
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { memberIds = [] } = await request.json();

  await admin.from('project_members').delete().eq('project_id', id);
  if (memberIds.length > 0) {
    await admin.from('project_members').insert(
      memberIds.map(uId => ({ project_id: id, user_id: uId }))
    );
  }

  return Response.json({ success: true, memberIds });
}

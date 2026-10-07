import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export async function PUT(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, entity_id, display_name').eq('id', user.id).single();
  if (!profile || !['admin', 'superadmin'].includes(profile.role))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { data: project } = await admin.from('projects').select('entity_id, name').eq('id', id).single();
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 });
  if (profile.role === 'admin' && project.entity_id !== profile.entity_id)
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { memberIds = [] } = await request.json();

  let validIds = [];
  if (memberIds.length > 0) {
    const { data: validMembers } = await admin
      .from('profiles').select('id').in('id', memberIds).eq('entity_id', project.entity_id);
    validIds = (validMembers || []).map(m => m.id);
  }

  await admin.from('project_members').delete().eq('project_id', id);
  if (validIds.length > 0) {
    await admin.from('project_members').insert(
      validIds.map(uId => ({ project_id: id, user_id: uId }))
    );
  }

  logAudit({
    entityId: project.entity_id,
    userId: user.id,
    userName: profile.display_name || user.email,
    action: 'Projekt tagok frissítve',
    targetType: 'project',
    targetId: id,
    targetName: project.name,
    details: { memberCount: validIds.length },
  });

  return Response.json({ success: true, memberIds });
}

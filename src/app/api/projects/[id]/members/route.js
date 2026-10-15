import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export async function PUT(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, display_name').eq('id', user.id).single();
  if (!profile || !['admin', 'superadmin'].includes(profile.role))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { data: project } = await admin.from('projects').select('owner_id, collective_id, name, created_by').eq('id', id).single();
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 });

  const isOwner = project.owner_id === user.id || project.created_by === user.id;
  if (profile.role !== 'superadmin' && !isOwner) {
    if (!project.collective_id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { data: mem } = await admin.from('collective_members').select('role').eq('collective_id', project.collective_id).eq('user_id', user.id).eq('status', 'active').single();
    if (!mem || !['owner', 'admin'].includes(mem.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { memberIds = [] } = await request.json();

  let validIds = [];
  if (memberIds.length > 0 && project.collective_id) {
    const { data: validMembers } = await admin
      .from('collective_members')
      .select('user_id')
      .eq('collective_id', project.collective_id)
      .in('user_id', memberIds)
      .eq('status', 'active');
    validIds = (validMembers || []).map(m => m.user_id);
  } else if (memberIds.length > 0) {
    validIds = memberIds;
  }

  await admin.from('project_members').delete().eq('project_id', id);
  if (validIds.length > 0) {
    await admin.from('project_members').insert(
      validIds.map(uId => ({ project_id: id, user_id: uId }))
    );
  }

  logAudit({
    entityId: project.collective_id || user.id,
    userId:   user.id,
    userName: profile.display_name || user.email,
    action:   'Projekt tagok frissítve',
    targetType: 'project',
    targetId:   id,
    targetName: project.name,
    details: { memberCount: validIds.length },
  });

  return Response.json({ success: true, memberIds });
}

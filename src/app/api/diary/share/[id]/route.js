import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

// DELETE /api/diary/share/[id] — delete share token (admin only, entity-scoped)
export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { data: profile } = await admin.from('profiles').select('id, role, entity_id, current_entity_id, display_name').eq('id', user.id).single();
  if (!profile || !['admin', 'superadmin'].includes(profile.role)) return Response.json({ error: 'Admin required' }, { status: 403 });

  const { data: token } = await admin.from('diary_share_tokens').select('id, project_id').eq('id', id).single();
  if (!token) return Response.json({ error: 'Token not found' }, { status: 404 });
  if (profile.role !== 'superadmin') {
    const { data: proj } = await admin.from('projects').select('owner_id, created_by').eq('id', token.project_id).single();
    if (!proj || (proj.owner_id !== profile.id && proj.created_by !== profile.id))
      return Response.json({ error: 'Access denied' }, { status: 403 });
  }

  const { error: delErr } = await admin.from('diary_share_tokens').delete().eq('id', id);
  if (delErr) return Response.json({ error: delErr.message }, { status: 500 });

  logAudit({
    entityId: token.entity_id,
    userId: profile.id,
    userName: profile.display_name,
    action: 'Diary share link deleted',
    targetType: 'diary_share_token',
    targetId: id,
  });

  return Response.json({ success: true });
}

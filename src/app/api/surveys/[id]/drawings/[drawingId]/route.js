import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export async function DELETE(request, { params }) {
  const { id, drawingId } = await params;

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, display_name').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { data: drawing } = await admin.from('survey_drawings').select('created_by, survey_id').eq('id', drawingId).single();
  if (!drawing || drawing.survey_id !== id) return Response.json({ error: 'Not found' }, { status: 404 });

  const isAdmin   = ['admin', 'superadmin'].includes(profile.role);
  const isCreator = drawing.created_by === user.id;

  let isKollektivOwner = false;
  if (!isAdmin && !isCreator) {
    const { data: survey } = await admin.from('surveys').select('collective_id').eq('id', id).is('deleted_at', null).single();
    if (survey?.collective_id) {
      const { data: mem } = await admin.from('collective_members')
        .select('role').eq('collective_id', survey.collective_id).eq('user_id', user.id).eq('status', 'active').maybeSingle();
      isKollektivOwner = mem?.role === 'owner' || mem?.role === 'admin';
    }
  }

  if (!isAdmin && !isCreator && !isKollektivOwner) {
    logAudit({ entityId: user.id, userId: user.id, userName: profile.display_name || '', action: 'Survey drawing delete denied', targetType: 'survey_drawing', targetId: drawingId, details: { error: 'Permission denied', survey_id: id } });
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error: delErr } = await admin.from('survey_drawings').delete().eq('id', drawingId);
  if (delErr) return Response.json({ error: delErr.message }, { status: 400 });
  logAudit({ entityId: user.id, userId: user.id, userName: profile.display_name || '', action: 'Survey drawing deleted', targetType: 'survey_drawing', targetId: drawingId });
  return Response.json({ success: true });
}

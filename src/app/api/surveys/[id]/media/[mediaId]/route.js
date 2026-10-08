import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteFromR2 } from '@/lib/r2';

export async function DELETE(request, { params }) {
  const { id: surveyId, mediaId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, entity_id').eq('id', user.id).single();
  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: survey } = await admin.from('surveys').select('entity_id').eq('id', surveyId).single();
  if (!survey) return Response.json({ error: 'Not found' }, { status: 404 });
  if (profile.role !== 'superadmin' && survey.entity_id !== profile.entity_id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: media } = await admin
    .from('survey_media')
    .select('drive_file_id')
    .eq('id', mediaId)
    .eq('survey_id', surveyId)
    .single();

  if (!media) return Response.json({ error: 'Media not found' }, { status: 404 });

  try { await deleteFromR2(media.drive_file_id); } catch {}

  const { error } = await admin.from('survey_media').delete().eq('id', mediaId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}

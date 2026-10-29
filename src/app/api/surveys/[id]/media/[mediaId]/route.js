import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteFromR2 } from '@/lib/r2';

export async function DELETE(request, { params }) {
  const { id: surveyId, mediaId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { data: survey } = await admin.from('surveys').select('owner_id, collective_id, shared_with, created_by').eq('id', surveyId).single();
  if (!survey) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: media } = await admin
    .from('survey_media')
    .select('*')
    .eq('id', mediaId)
    .eq('survey_id', surveyId)
    .single();
  if (!media) return Response.json({ error: 'Media not found' }, { status: 404 });

  if (profile.role !== 'superadmin') {
    const isOwner  = survey.owner_id === user.id || survey.created_by === user.id;
    const isShared = (survey.shared_with || []).includes(user.id);

    if (!isOwner && !isShared) {
      if (!survey.collective_id) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const { data: mem } = await admin.from('collective_members')
        .select('role').eq('collective_id', survey.collective_id)
        .eq('user_id', user.id).eq('status', 'active').maybeSingle();
      if (!mem) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const isKollektivOwner = mem.role === 'owner' || mem.role === 'admin';
      if (!isKollektivOwner) {
        // Contributor: can only delete files they personally uploaded
        if (media.uploaded_by !== user.id) {
          return Response.json({
            error: 'Ezt a fájlt nem törölheted, mert nem te töltötted fel. A kollektíva tulajdonosától kérhetsz segítséget.',
          }, { status: 403 });
        }
      }
    }
  }

  try { await deleteFromR2(media.drive_file_id); } catch {}

  const { error } = await admin.from('survey_media').delete().eq('id', mediaId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}

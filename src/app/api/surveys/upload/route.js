import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadToR2, r2PublicUrl, diaryMediaKey } from '@/lib/r2';

const MAX_FILES = 10;
const MAX_SIZE_BYTES = 200 * 1024 * 1024;

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { data: profile } = await admin.from('profiles').select('id, role, entity_id').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 403 });
  if (!['admin', 'superadmin'].includes(profile.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  let formData;
  try { formData = await request.formData(); }
  catch { return Response.json({ error: 'Érvénytelen feltöltési kérés' }, { status: 400 }); }

  const surveyId = formData.get('survey_id');
  if (!surveyId) return Response.json({ error: 'survey_id kötelező' }, { status: 400 });
  const entryId = formData.get('entry_id') || null;
  const mediaType = formData.get('media_type') || 'photo';

  const { data: survey } = await admin.from('surveys').select('entity_id').eq('id', surveyId).single();
  if (!survey) return Response.json({ error: 'Felmérés nem található' }, { status: 404 });
  if (profile.role !== 'superadmin' && survey.entity_id !== profile.entity_id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const entityId = survey.entity_id;
  const files = formData.getAll('files');
  if (!files?.length) return Response.json({ error: 'Nincs feltöltendő fájl' }, { status: 400 });
  if (files.length > MAX_FILES) return Response.json({ error: `Max ${MAX_FILES} fájl egyszerre` }, { status: 400 });

  const results = [];
  for (const file of files) {
    if (!(file instanceof File)) continue;
    if (file.size > MAX_SIZE_BYTES) return Response.json({ error: `"${file.name}" túl nagy (max 200 MB)` }, { status: 400 });

    const mimeType = file.type || 'application/octet-stream';
    const key = diaryMediaKey(entityId, mimeType, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    try { await uploadToR2(key, buffer, mimeType); }
    catch (err) { return Response.json({ error: `Feltöltési hiba: ${err.message}` }, { status: 500 }); }

    const publicUrl = r2PublicUrl(key);
    const isImage = mimeType.startsWith('image/');

    const { data: media, error: dbErr } = await admin.from('survey_media').insert([{
      survey_id: surveyId,
      entry_id: entryId,
      media_type: mediaType,
      drive_file_id: key,
      drive_view_url: publicUrl,
      thumbnail_url: isImage ? publicUrl : null,
      mime_type: mimeType,
      file_name: file.name,
    }]).select().single();

    if (dbErr) return Response.json({ error: `DB hiba: ${dbErr.message}` }, { status: 500 });
    results.push(media);
  }

  return Response.json({ media: results }, { status: 200 });
}

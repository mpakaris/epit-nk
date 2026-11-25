import sharp from 'sharp';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadToR2, r2PublicUrl, diaryMediaKey } from '@/lib/r2';
import { checkSurveyAccess } from '@/lib/surveyAccess';
import { logAudit } from '@/lib/audit';
import { checkCollectiveStatus } from '@/lib/collectiveGuard';
import { getMediaLimits } from '@/lib/subscriptionLimits';

const MAX_FILES = 10;

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { data: profile } = await admin.from('profiles').select('id, role, display_name, is_subscription_premium, subscription_tier, trial_ends_at').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 403 });
  let formData;
  try { formData = await request.formData(); }
  catch { return Response.json({ error: 'Érvénytelen feltöltési kérés' }, { status: 400 }); }

  const surveyId = formData.get('survey_id');
  if (!surveyId) return Response.json({ error: 'survey_id kötelező' }, { status: 400 });
  const entryId = formData.get('entry_id') || null;
  const mediaType = formData.get('media_type') || 'photo';

  const { data: survey } = await admin.from('surveys').select('owner_id, collective_id, shared_with, created_by, is_read_only').eq('id', surveyId).is('deleted_at', null).single();
  if (!survey) return Response.json({ error: 'Felmérés nem található' }, { status: 404 });
  if (profile.role !== 'superadmin') {
    const access = await checkSurveyAccess(admin, survey, user.id, surveyId);
    if (!access.allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (survey.is_read_only)
      return Response.json({ error: 'Ez a dokumentum csak olvasható. Prémium csomagra váltva újra szerkeszthetővé válik.', read_only: true }, { status: 403 });
    const statusBlocked = await checkCollectiveStatus(admin, survey.collective_id);
    if (statusBlocked) return statusBlocked;
  }

  const entityId = survey.collective_id || user.id;
  const files = formData.getAll('files');
  if (!files?.length) return Response.json({ error: 'Nincs feltöltendő fájl' }, { status: 400 });
  if (files.length > MAX_FILES) return Response.json({ error: `Max ${MAX_FILES} fájl egyszerre` }, { status: 400 });

  // ── Media limits check ────────────────────────────────────────────────────
  let ownerProfile = null;
  if (survey.collective_id && survey.owner_id !== user.id) {
    const { data: op } = await admin.from('profiles')
      .select('id, role, is_subscription_premium, subscription_tier, trial_ends_at')
      .eq('id', survey.owner_id).single();
    ownerProfile = op;
  }
  const limits = await getMediaLimits(admin, profile, !!survey.collective_id, ownerProfile ?? (survey.collective_id ? profile : null));

  const validFiles    = files.filter(f => f instanceof File);
  const incomingImages = validFiles.filter(f => (f.type || '').startsWith('image/')).length;
  const incomingVideos = validFiles.filter(f => (f.type || '').startsWith('video/')).length;

  if (incomingVideos > 0 && limits.maxVideos === 0)
    return Response.json({ error: 'Videó feltöltés csak Prémium csomagban elérhető.' }, { status: 403 });

  if (entryId && incomingImages > 0 && limits.maxPhotos !== Infinity) {
    const { count: existingPhotos } = await admin.from('survey_media')
      .select('id', { count: 'exact', head: true }).eq('entry_id', entryId).like('mime_type', 'image/%');
    if ((existingPhotos ?? 0) + incomingImages > limits.maxPhotos)
      return Response.json({ error: `Szekciónként maximum ${limits.maxPhotos} fotó tölthető fel. Váltj Prémiumra a korlátlan feltöltéshez.` }, { status: 403 });
  }

  if (entryId && incomingVideos > 0 && limits.maxVideos !== Infinity) {
    const { count: existingVideos } = await admin.from('survey_media')
      .select('id', { count: 'exact', head: true }).eq('entry_id', entryId).like('mime_type', 'video/%');
    if ((existingVideos ?? 0) + incomingVideos > limits.maxVideos)
      return Response.json({ error: `Szekciónként maximum ${limits.maxVideos} videó tölthető fel.` }, { status: 403 });
  }

  const results = [];
  for (const file of files) {
    if (!(file instanceof File)) continue;
    const isVideo = (file.type || '').startsWith('video/');
    const mimeType  = file.type || 'application/octet-stream';
    const isVideoF  = mimeType.startsWith('video/');
    const isImageF  = mimeType.startsWith('image/');
    if (isVideoF || isImageF) {
      const maxMB = isVideoF ? limits.maxVideoSizeMB : limits.maxPhotoSizeMB;
      if (maxMB !== Infinity && file.size > maxMB * 1024 * 1024)
        return Response.json({ error: `"${file.name}" túl nagy (max ${maxMB} MB)` }, { status: 400 });
    }

    let buffer = Buffer.from(await file.arrayBuffer());
    let uploadMime = mimeType;
    let uploadName = file.name;

    if (mimeType.startsWith('image/')) {
      try {
        buffer = await sharp(buffer)
          .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        uploadMime = 'image/webp';
        uploadName = file.name.replace(/\.[^.]+$/, '.webp');
      } catch { /* fall through with original buffer on sharp failure */ }
    }

    const key = diaryMediaKey(entityId, uploadMime, uploadName);

    try { await uploadToR2(key, buffer, uploadMime); }
    catch (err) { return Response.json({ error: `Feltöltési hiba: ${err.message}` }, { status: 500 }); }

    const publicUrl = r2PublicUrl(key);
    const isImage   = uploadMime.startsWith('image/');

    let { data: media, error: dbErr } = await admin.from('survey_media').insert([{
      survey_id: surveyId,
      entry_id: entryId,
      media_type: mediaType,
      drive_file_id: key,
      drive_view_url: publicUrl,
      thumbnail_url: isImage ? publicUrl : null,
      mime_type: uploadMime,
      file_name: uploadName,
      uploaded_by: user.id,
    }]).select().single();

    // Fallback if column not yet migrated
    if (dbErr?.message?.includes('uploaded_by')) {
      ({ data: media, error: dbErr } = await admin.from('survey_media').insert([{
        survey_id: surveyId,
        entry_id: entryId,
        media_type: mediaType,
        drive_file_id: key,
        drive_view_url: publicUrl,
        thumbnail_url: isImage ? publicUrl : null,
        mime_type: uploadMime,
        file_name: uploadName,
      }]).select().single());
    }

    if (dbErr) return Response.json({ error: `DB hiba: ${dbErr.message}` }, { status: 500 });
    results.push(media);
  }

  logAudit({ entityId: survey.collective_id || user.id, userId: user.id, userName: profile.display_name || '', action: 'Survey media uploaded', targetType: 'survey_media', targetId: surveyId, details: { count: results.length, survey_id: surveyId } });
  return Response.json({ media: results }, { status: 200 });
}

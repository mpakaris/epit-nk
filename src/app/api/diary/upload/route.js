import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadToR2, r2PublicUrl, diaryMediaKey } from '@/lib/r2';

const MAX_FILES = 10;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;   // 4 MB
const MAX_VIDEO_BYTES = 10 * 1024 * 1024;  // 10 MB

// POST /api/diary/upload — upload photos/videos to Cloudflare R2
export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { data: profile } = await admin.from('profiles').select('id, role').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 403 });

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Érvénytelen feltöltési kérés' }, { status: 400 });
  }

  // Use user.id as the storage namespace — no entity_id needed
  const entityId = user.id;

  const files = formData.getAll('files');
  if (!files || files.length === 0) return Response.json({ error: 'Nincs feltöltendő fájl' }, { status: 400 });
  if (files.length > MAX_FILES) return Response.json({ error: `Egyszerre legfeljebb ${MAX_FILES} fájlt lehet feltölteni` }, { status: 400 });

  const results = [];

  for (const file of files) {
    if (!(file instanceof File)) continue;
    const isVideo = (file.type || '').startsWith('video/');
    const limit   = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > limit) {
      return Response.json({ error: `"${file.name}" túl nagy (max ${limit / 1024 / 1024} MB)` }, { status: 400 });
    }

    const mimeType = file.type || 'application/octet-stream';
    const key = diaryMediaKey(entityId, mimeType, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      await uploadToR2(key, buffer, mimeType);
    } catch (err) {
      return Response.json({ error: `Feltöltési hiba: ${err.message}` }, { status: 500 });
    }

    const publicUrl = r2PublicUrl(key);
    const isImage = mimeType.startsWith('image/');

    const { data: photo, error: dbErr } = await admin.from('diary_photos').insert([{
      entry_id: null,
      uploaded_by: user.id,
      drive_file_id: key,
      drive_view_url: publicUrl,
      thumbnail_url: isImage ? publicUrl : null,
      mime_type: mimeType,
    }]).select().single();

    if (dbErr) return Response.json({ error: `DB hiba: ${dbErr.message}` }, { status: 500 });

    results.push({
      id: photo.id,
      key,
      url: publicUrl,
      thumbnail_url: isImage ? publicUrl : null,
      mime_type: mimeType,
    });
  }

  return Response.json({ photos: results }, { status: 200 });
}

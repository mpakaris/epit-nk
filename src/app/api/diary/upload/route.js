import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadToR2, r2PublicUrl, diaryMediaKey } from '@/lib/r2';

const MAX_FILES = 10;
const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB per file (videos can be large)

// POST /api/diary/upload — upload photos/videos to Cloudflare R2
export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, entity_id')
    .eq('id', user.id)
    .single();

  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 403 });
  if (profile.role !== 'superadmin' && !profile.entity_id) return Response.json({ error: 'No entity assigned' }, { status: 400 });

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Érvénytelen feltöltési kérés' }, { status: 400 });
  }

  // Resolve entity_id — superadmin passes project_id in form so we can derive it
  let entityId = profile.entity_id;
  if (profile.role === 'superadmin') {
    const projectId = formData.get('project_id');
    if (!projectId) return Response.json({ error: 'project_id required for superadmin uploads' }, { status: 400 });
    const { data: proj } = await admin.from('projects').select('entity_id').eq('id', projectId).single();
    if (!proj) return Response.json({ error: 'Project not found' }, { status: 404 });
    entityId = proj.entity_id;
  }

  const files = formData.getAll('files');
  if (!files || files.length === 0) return Response.json({ error: 'Nincs feltöltendő fájl' }, { status: 400 });
  if (files.length > MAX_FILES) return Response.json({ error: `Egyszerre legfeljebb ${MAX_FILES} fájlt lehet feltölteni` }, { status: 400 });

  const results = [];

  for (const file of files) {
    if (!(file instanceof File)) continue;
    if (file.size > MAX_SIZE_BYTES) {
      return Response.json({ error: `A "${file.name}" fájl túl nagy (max 200 MB)` }, { status: 400 });
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
      entity_id: entityId,
      entry_id: null,
      drive_file_id: key,           // repurposed: stores the R2 object key
      drive_view_url: publicUrl,    // repurposed: stores the R2 public URL
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

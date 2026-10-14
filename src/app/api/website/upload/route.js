import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadToR2, deleteFromR2, r2PublicUrl, toWebp } from '@/lib/r2';

const MAX_SIZE_ABOUT   = 5  * 1024 * 1024; // 5 MB for profile photo
const MAX_SIZE_GALLERY = 15 * 1024 * 1024; // 15 MB for gallery
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/tiff'];
const MAX_GALLERY_ITEMS = 20;

function websiteUploadKey(userId, type, filename) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const folder = type === 'about' ? 'about' : 'gallery';
  return `user-uploads/${userId}/${folder}/${unique}.webp`;
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  // Verify website exists and belongs to user
  const { data: website } = await admin
    .from('user_websites')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!website) return Response.json({ error: 'Weboldal nem található' }, { status: 404 });

  let formData;
  try { formData = await request.formData(); }
  catch { return Response.json({ error: 'Érvénytelen feltöltési kérés' }, { status: 400 }); }

  const type = formData.get('type'); // 'about' | 'gallery'
  if (!['about', 'gallery'].includes(type)) {
    return Response.json({ error: 'Érvénytelen típus' }, { status: 400 });
  }

  const files = formData.getAll('files');
  if (!files?.length) return Response.json({ error: 'Nincs feltöltendő fájl' }, { status: 400 });

  // For 'about', only 1 file; for 'gallery', up to 10 at once
  const limit = type === 'about' ? 1 : 10;
  if (files.length > limit) {
    return Response.json({ error: `Egyszerre maximum ${limit} fájl tölthető fel` }, { status: 400 });
  }

  // Optionally check total gallery items
  if (type === 'gallery') {
    const { data: section } = await admin
      .from('website_sections')
      .select('content')
      .eq('website_id', website.id)
      .eq('section_type', 'gallery')
      .maybeSingle();
    const existing = section?.content?.items?.length || 0;
    if (existing + files.length > MAX_GALLERY_ITEMS) {
      return Response.json({ error: `A galéria legfeljebb ${MAX_GALLERY_ITEMS} képet tartalmazhat` }, { status: 400 });
    }
  }

  const results = [];

  for (const file of files) {
    if (!(file instanceof File)) continue;
    const maxBytes = type === 'about' ? MAX_SIZE_ABOUT : MAX_SIZE_GALLERY;
    const maxLabel = type === 'about' ? '5 MB' : '15 MB';
    if (file.size > maxBytes) {
      return Response.json({ error: `"${file.name}" túl nagy (max ${maxLabel})` }, { status: 400 });
    }
    const mimeType = file.type?.toLowerCase() || '';
    if (!ALLOWED_TYPES.some(t => mimeType.includes(t.split('/')[1]))) {
      return Response.json({ error: `"${file.name}" nem támogatott formátum` }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    // Convert to WebP (maxDimension: 2400 for gallery, 1200 for about portrait photo)
    const maxDimension = type === 'about' ? 1200 : 2400;
    const { buffer: webpBuffer } = await toWebp(inputBuffer, { quality: 82, maxDimension });

    const key = websiteUploadKey(user.id, type, file.name);
    await uploadToR2(key, webpBuffer, 'image/webp');

    results.push({ r2_key: key, url: r2PublicUrl(key), caption: '' });
  }

  return Response.json({ files: results });
}

export async function DELETE(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { r2_key } = await request.json();
  if (!r2_key) return Response.json({ error: 'r2_key szükséges' }, { status: 400 });

  // Security: key must belong to this user
  if (!r2_key.startsWith(`user-uploads/${user.id}/`)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await deleteFromR2(r2_key);
  return Response.json({ success: true });
}

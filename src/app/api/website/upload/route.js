import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadToR2, deleteFromR2, r2PublicUrl, toWebp } from '@/lib/r2';
import { resolveEffectiveUserId } from '@/lib/godMode';

const MAX_SIZE_ABOUT        = 5  * 1024 * 1024;  // 5 MB
const MAX_SIZE_GALLERY_IMG  = 15 * 1024 * 1024;  // 15 MB
const MAX_SIZE_GALLERY_VID  = 25 * 1024 * 1024;  // 25 MB
const MAX_GALLERY_IMAGES    = 25;
const MAX_GALLERY_VIDEOS    = 10;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/tiff'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];

function galleryKey(userId, filename, isVideo) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (isVideo) {
    const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : 'mp4';
    return `user-uploads/${userId}/gallery/${unique}.${ext}`;
  }
  return `user-uploads/${userId}/gallery/${unique}.webp`;
}

function aboutKey(userId) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `user-uploads/${userId}/about/${unique}.webp`;
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const effectiveUserId = await resolveEffectiveUserId(request, user, admin);

  const { data: website } = await admin
    .from('user_websites')
    .select('id')
    .eq('user_id', effectiveUserId)
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

  const limit = type === 'about' ? 1 : 10;
  if (files.length > limit) {
    return Response.json({ error: `Egyszerre maximum ${limit} fájl tölthető fel` }, { status: 400 });
  }

  if (type === 'gallery') {
    const { data: section } = await admin
      .from('website_sections')
      .select('content')
      .eq('website_id', website.id)
      .eq('section_type', 'gallery')
      .maybeSingle();
    const existingItems  = section?.content?.items || [];
    const existingImages = existingItems.filter(i => i.type !== 'video').length;
    const existingVideos = existingItems.filter(i => i.type === 'video').length;

    const incomingImages = files.filter(f => f instanceof File && ALLOWED_IMAGE_TYPES.some(t => f.type?.toLowerCase().includes(t.split('/')[1]))).length;
    const incomingVideos = files.filter(f => f instanceof File && ALLOWED_VIDEO_TYPES.some(t => f.type?.toLowerCase() === t)).length;

    if (existingImages + incomingImages > MAX_GALLERY_IMAGES) {
      return Response.json({ error: `A galéria legfeljebb ${MAX_GALLERY_IMAGES} képet tartalmazhat` }, { status: 400 });
    }
    if (existingVideos + incomingVideos > MAX_GALLERY_VIDEOS) {
      return Response.json({ error: `A galéria legfeljebb ${MAX_GALLERY_VIDEOS} videót tartalmazhat` }, { status: 400 });
    }
  }

  const results = [];

  for (const file of files) {
    if (!(file instanceof File)) continue;

    const mimeType = file.type?.toLowerCase() || '';
    const isVideo  = ALLOWED_VIDEO_TYPES.some(t => mimeType === t);
    const isImage  = ALLOWED_IMAGE_TYPES.some(t => mimeType.includes(t.split('/')[1]));

    if (!isVideo && !isImage) {
      return Response.json({ error: `"${file.name}" nem támogatott formátum` }, { status: 400 });
    }

    if (type === 'about' && !isImage) {
      return Response.json({ error: 'Profilképnek csak kép tölthetó fel' }, { status: 400 });
    }

    const maxBytes = isVideo ? MAX_SIZE_GALLERY_VID : (type === 'about' ? MAX_SIZE_ABOUT : MAX_SIZE_GALLERY_IMG);
    const maxLabel = isVideo ? '25 MB' : (type === 'about' ? '5 MB' : '15 MB');
    if (file.size > maxBytes) {
      return Response.json({ error: `"${file.name}" túl nagy (max ${maxLabel})` }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    if (isVideo) {
      const key = galleryKey(effectiveUserId, file.name, true);
      await uploadToR2(key, inputBuffer, mimeType);
      results.push({ r2_key: key, url: r2PublicUrl(key), caption: '', type: 'video' });
    } else {
      const maxDimension = type === 'about' ? 1200 : 2400;
      const { buffer: webpBuffer } = await toWebp(inputBuffer, { quality: 82, maxDimension });
      const key = type === 'about' ? aboutKey(effectiveUserId) : galleryKey(effectiveUserId, file.name, false);
      await uploadToR2(key, webpBuffer, 'image/webp');
      results.push({ r2_key: key, url: r2PublicUrl(key), caption: '', type: 'image' });
    }
  }

  return Response.json({ files: results });
}

export async function DELETE(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const effectiveUserId = await resolveEffectiveUserId(request, user, admin);

  const { r2_key } = await request.json();
  if (!r2_key) return Response.json({ error: 'r2_key szükséges' }, { status: 400 });

  if (!r2_key.startsWith(`user-uploads/${effectiveUserId}/`)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await deleteFromR2(r2_key);
  return Response.json({ success: true });
}

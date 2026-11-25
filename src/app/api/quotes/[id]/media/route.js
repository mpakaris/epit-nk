// POST /api/quotes/[id]/media — upload media to a quote (document or section level)
// Body: multipart/form-data
//   files[]     — File objects
//   owner_type  — 'quote' | 'quote_section'
//   owner_id    — quoteId for 'quote', sectionId for 'quote_section'

import sharp from 'sharp';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadToR2, r2PublicUrl, diaryMediaKey } from '@/lib/r2';
import { logAudit } from '@/lib/audit';
import { checkCollectiveStatus } from '@/lib/collectiveGuard';
import { getMediaLimits } from '@/lib/subscriptionLimits';

const MAX_FILES     = 10;
const MAX_DOC_BYTES = 20 * 1024 * 1024;  // PDFs / floor plans

async function getCallerAndQuote(quoteId, user, admin) {
  const { data: quote } = await admin
    .from('quotes').select('id, owner_id, created_by, collective_id, is_read_only').eq('id', quoteId).is('deleted_at', null).single();
  if (!quote) return { err: 'Not found', status: 404 };

  const isOwner = quote.owner_id === user.id || quote.created_by === user.id;
  if (!isOwner) {
    if (!quote.collective_id) return { err: 'Forbidden', status: 403 };
    const { data: mem } = await admin.from('collective_members')
      .select('role').eq('collective_id', quote.collective_id)
      .eq('user_id', user.id).eq('status', 'active').maybeSingle();
    if (!mem || (mem.role !== 'owner' && mem.role !== 'admin'))
      return { err: 'Forbidden', status: 403 };
  }
  return { quote };
}

export async function POST(request, { params }) {
  const { id: quoteId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('display_name, role, is_subscription_premium, subscription_tier, trial_ends_at').eq('id', user.id).single();

  const ctx = await getCallerAndQuote(quoteId, user, admin);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  if (profile?.role !== 'superadmin' && ctx.quote.is_read_only)
    return Response.json({ error: 'Ez a dokumentum csak olvasható. Prémium csomagra váltva újra szerkeszthetővé válik.', read_only: true }, { status: 403 });

  const statusBlocked = await checkCollectiveStatus(admin, ctx.quote.collective_id);
  if (statusBlocked) return statusBlocked;

  let formData;
  try { formData = await request.formData(); }
  catch { return Response.json({ error: 'Érvénytelen feltöltési kérés' }, { status: 400 }); }

  const ownerType = formData.get('owner_type') || 'quote';
  const ownerId   = formData.get('owner_id')   || quoteId;
  const files     = formData.getAll('files');

  if (!files?.length) return Response.json({ error: 'Nincs feltöltendő fájl' }, { status: 400 });
  if (files.length > MAX_FILES) return Response.json({ error: `Max ${MAX_FILES} fájl egyszerre` }, { status: 400 });

  // ── Media limits check ────────────────────────────────────────────────────
  let ownerProfile = null;
  if (ctx.quote.collective_id && ctx.quote.owner_id !== user.id) {
    const { data: op } = await admin.from('profiles')
      .select('id, role, is_subscription_premium, subscription_tier, trial_ends_at')
      .eq('id', ctx.quote.owner_id).single();
    ownerProfile = op;
  }
  const limits = await getMediaLimits(admin, profile, !!ctx.quote.collective_id, ownerProfile ?? (ctx.quote.collective_id ? profile : null));

  const validFiles     = files.filter(f => f instanceof File);
  const incomingImages = validFiles.filter(f => (f.type || '').startsWith('image/')).length;
  const incomingVideos = validFiles.filter(f => (f.type || '').startsWith('video/')).length;

  if (incomingVideos > 0 && limits.maxVideos === 0)
    return Response.json({ error: 'Videó feltöltés csak Prémium csomagban elérhető.' }, { status: 403 });

  if (ownerType === 'quote_section' && incomingImages > 0 && limits.maxPhotos !== Infinity) {
    const { count: existingPhotos } = await admin.from('media_items')
      .select('id', { count: 'exact', head: true })
      .eq('owner_type', 'quote_section').eq('owner_id', ownerId).like('mime_type', 'image/%');
    if ((existingPhotos ?? 0) + incomingImages > limits.maxPhotos)
      return Response.json({ error: `Szekciónként maximum ${limits.maxPhotos} fotó tölthető fel. Váltj Prémiumra a korlátlan feltöltéshez.` }, { status: 403 });
  }

  if (ownerType === 'quote_section' && incomingVideos > 0 && limits.maxVideos !== Infinity) {
    const { count: existingVideos } = await admin.from('media_items')
      .select('id', { count: 'exact', head: true })
      .eq('owner_type', 'quote_section').eq('owner_id', ownerId).like('mime_type', 'video/%');
    if ((existingVideos ?? 0) + incomingVideos > limits.maxVideos)
      return Response.json({ error: `Szekciónként maximum ${limits.maxVideos} videó tölthető fel.` }, { status: 403 });
  }

  const entityId = ctx.quote.collective_id || user.id;
  const results  = [];

  for (const file of files) {
    if (!(file instanceof File)) continue;
    const mimeType  = file.type || 'application/octet-stream';
    const isVideo   = mimeType.startsWith('video/');
    const isDoc     = mimeType === 'application/pdf' || mimeType.startsWith('application/');
    const isImage   = mimeType.startsWith('image/');
    const limit     = isDoc ? MAX_DOC_BYTES : isVideo ? limits.maxVideoSizeMB * 1024 * 1024 : isImage ? limits.maxPhotoSizeMB * 1024 * 1024 : MAX_DOC_BYTES;
    if (file.size > limit) return Response.json({ error: `"${file.name}" túl nagy` }, { status: 400 });

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

    const publicUrl  = r2PublicUrl(key);

    const { data: item, error: dbErr } = await admin.from('media_items').insert([{
      r2_key:        key,
      cdn_url:       publicUrl,
      thumbnail_url: isImage ? publicUrl : null,
      mime_type:     uploadMime,
      file_size_kb:  Math.ceil(buffer.length / 1024),
      owner_type:    ownerType,
      owner_id:      ownerId,
      document_type: 'quote',
      document_id:   quoteId,
      created_by:    user.id,
      sort_order:    0,
    }]).select().single();

    if (dbErr) return Response.json({ error: `DB hiba: ${dbErr.message}` }, { status: 500 });
    results.push(item);
  }

  logAudit({ entityId, userId: user.id, userName: profile?.display_name || user.email, action: 'Quote media uploaded', targetType: 'media_item', targetId: quoteId, details: { count: results.length, owner_type: ownerType } });
  return Response.json({ media: results });
}

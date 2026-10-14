import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadToR2, deleteFromR2, r2PublicUrl, toWebp } from '@/lib/r2';

const MAX_SIZE_BYTES = 30 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/tiff'];

function libraryKey(tradeId, filename) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const folder = tradeId ? `library/${tradeId}` : 'library/general';
  return `${folder}/${unique}.webp`;
}

async function requireSuperadmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'superadmin') return { error: 'Forbidden', status: 403 };
  return { user, admin };
}

export async function GET(request) {
  const auth = await requireSuperadmin();
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const tradeId = searchParams.get('trade_id');

  let query = auth.admin
    .from('image_library')
    .select('*, trade:trades(name_hu)')
    .order('created_at', { ascending: false });

  if (tradeId === 'generic') query = query.is('trade_id', null);
  else if (tradeId)          query = query.eq('trade_id', tradeId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ images: (data || []).map(img => ({ ...img, url: r2PublicUrl(img.r2_key) })) });
}

export async function POST(request) {
  const auth = await requireSuperadmin();
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  let formData;
  try { formData = await request.formData(); }
  catch { return Response.json({ error: 'Érvénytelen kérés' }, { status: 400 }); }

  const tradeId = formData.get('trade_id') || null;
  const orientation = formData.get('orientation') || 'horizontal';
  const altText = formData.get('alt_text') || '';
  const files = formData.getAll('files');

  if (!files?.length) return Response.json({ error: 'Nincs fájl' }, { status: 400 });

  const results = [];
  for (const file of files) {
    if (!(file instanceof File)) continue;
    if (file.size > MAX_SIZE_BYTES) return Response.json({ error: `"${file.name}" túl nagy (max 30 MB)` }, { status: 400 });
    if (!ALLOWED_MIME.some(t => (file.type || '').toLowerCase().includes(t.split('/')[1]))) {
      return Response.json({ error: `"${file.name}" nem támogatott formátum` }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const maxDimension = orientation === 'horizontal' ? 2400 : 1600;
    const { buffer: webpBuffer } = await toWebp(inputBuffer, { quality: 85, maxDimension });

    const key = libraryKey(tradeId, file.name);
    await uploadToR2(key, webpBuffer, 'image/webp');

    const { data: img, error: dbErr } = await auth.admin.from('image_library').insert({
      trade_id: tradeId || null,
      r2_key: key,
      orientation,
      alt_text: altText,
      created_by: auth.user.id,
    }).select().single();

    if (dbErr) return Response.json({ error: dbErr.message }, { status: 500 });
    results.push({ ...img, url: r2PublicUrl(key) });
  }

  return Response.json({ images: results }, { status: 201 });
}

export async function DELETE(request) {
  const auth = await requireSuperadmin();
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { id } = await request.json();
  if (!id) return Response.json({ error: 'id szükséges' }, { status: 400 });

  const { data: img } = await auth.admin.from('image_library').select('r2_key').eq('id', id).single();
  if (!img) return Response.json({ error: 'Nem található' }, { status: 404 });

  await deleteFromR2(img.r2_key);
  await auth.admin.from('image_library').delete().eq('id', id);

  return Response.json({ success: true });
}

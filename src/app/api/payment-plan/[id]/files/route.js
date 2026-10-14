import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadToR2, r2PublicUrl } from '@/lib/r2';

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

function paymentFileKey(entityId, filename) {
  const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : 'bin';
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${entityId}/payments/${unique}.${ext}`;
}

export async function POST(request, { params }) {
  const { id: itemId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, entity_id').eq('id', user.id).single();
  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    return Response.json({ error: 'Nincs jogosultság' }, { status: 403 });
  }

  const { data: item } = await admin.from('payment_plan_items').select('project_id, entity_id').eq('id', itemId).single();
  if (!item) return Response.json({ error: 'Tétel nem található' }, { status: 404 });

  let formData;
  try { formData = await request.formData(); }
  catch { return Response.json({ error: 'Érvénytelen feltöltési kérés' }, { status: 400 }); }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) return Response.json({ error: 'Nincs fájl' }, { status: 400 });
  if (file.size > MAX_SIZE_BYTES) return Response.json({ error: 'A fájl túl nagy (max 20 MB)' }, { status: 400 });

  const mimeType = file.type || 'application/octet-stream';
  const entityId = item.entity_id;
  const key = paymentFileKey(entityId, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  try { await uploadToR2(key, buffer, mimeType); }
  catch (err) { return Response.json({ error: `Feltöltési hiba: ${err.message}` }, { status: 500 }); }

  const publicUrl = r2PublicUrl(key);

  const { data: record, error: dbErr } = await admin.from('payment_item_files').insert([{
    item_id: itemId,
    uploaded_by: user.id,
    file_url: publicUrl,
    storage_path: key,
    file_name: file.name,
    mime_type: mimeType,
  }]).select().single();

  if (dbErr) return Response.json({ error: `DB hiba: ${dbErr.message}` }, { status: 500 });
  return Response.json({ file: record });
}

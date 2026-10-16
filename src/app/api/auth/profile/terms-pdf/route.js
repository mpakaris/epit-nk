import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadToR2, r2PublicUrl } from '@/lib/r2';

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) return Response.json({ error: 'Nincs fájl' }, { status: 400 });
  if (file.type !== 'application/pdf') return Response.json({ error: 'Csak PDF fájl tölthető fel' }, { status: 400 });
  if (file.size > MAX_PDF_BYTES) return Response.json({ error: 'A fájl mérete maximum 10 MB lehet' }, { status: 400 });

  const key = `terms/${user.id}/aszf.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await uploadToR2(key, buffer, 'application/pdf');
  } catch (err) {
    return Response.json({ error: `Feltöltési hiba: ${err.message}` }, { status: 500 });
  }

  const url = r2PublicUrl(key);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .update({ terms_pdf_url: url, terms_pdf_name: file.name, terms_pdf_uploaded_at: new Date().toISOString() })
    .eq('id', user.id)
    .select('terms_pdf_url, terms_pdf_name, terms_pdf_uploaded_at')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ terms_pdf_url: null, terms_pdf_name: null, terms_pdf_uploaded_at: null })
    .eq('id', user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

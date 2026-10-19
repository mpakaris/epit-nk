import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadToR2, r2PublicUrl, toWebp } from '@/lib/r2';

export const R2_KEY = 'platform/about-me.webp';

async function requireSuperadmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'superadmin') return { error: 'Forbidden', status: 403 };
  return { user };
}

export async function GET() {
  return Response.json({ url: r2PublicUrl(R2_KEY) });
}

export async function POST(request) {
  const auth = await requireSuperadmin();
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  let formData;
  try { formData = await request.formData(); }
  catch { return Response.json({ error: 'Érvénytelen kérés' }, { status: 400 }); }

  const file = formData.get('file');
  if (!(file instanceof File)) return Response.json({ error: 'Nincs fájl' }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return Response.json({ error: 'Max 20 MB' }, { status: 400 });

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const { buffer: webpBuffer } = await toWebp(inputBuffer, { quality: 88, maxDimension: 1200 });

  await uploadToR2(R2_KEY, webpBuffer, 'image/webp');

  return Response.json({ url: r2PublicUrl(R2_KEY) });
}

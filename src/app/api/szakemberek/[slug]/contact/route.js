import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request, { params }) {
  const { slug } = await params;

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Érvénytelen kérés' }, { status: 400 }); }

  const { name, email, phone, message } = body;
  if (!name?.trim()) return Response.json({ error: 'Név megadása kötelező' }, { status: 400 });
  if (!email?.trim() && !phone?.trim()) {
    return Response.json({ error: 'Email cím vagy telefonszám megadása kötelező' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: website } = await admin
    .from('user_websites')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (!website) return Response.json({ error: 'Nem található' }, { status: 404 });

  const { error } = await admin.from('website_contact_leads').insert({
    website_id: website.id,
    name: name.trim(),
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    message: message?.trim() || null,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}

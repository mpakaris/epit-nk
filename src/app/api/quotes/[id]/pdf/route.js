import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateOfferPdf } from '@/lib/generateOfferPdf';

export async function GET(request, { params }) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: quote } = await admin.from('quotes').select('title, offer_number, owner_id, collective_id').eq('id', id).single();
  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  const isOwner      = quote.owner_id === user.id;
  const isSuperAdmin = profile?.role === 'superadmin';

  let isKollektivOwner = false;
  if (!isOwner && !isSuperAdmin && quote.collective_id) {
    const { data: mem } = await admin
      .from('collective_members')
      .select('role')
      .eq('collective_id', quote.collective_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    isKollektivOwner = mem?.role === 'owner' || mem?.role === 'admin';
  }

  if (!isOwner && !isSuperAdmin && !isKollektivOwner) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const accent = new URL(request.url).searchParams.get('accent') || '#2563eb';
    const pdfBuffer = await generateOfferPdf(id, user.id, accent);

    const safeName = quote.offer_number
      ? quote.offer_number.replace(/\//g, '-').replace(/[^\w\s-]/g, '').trim()
      : (quote.title || 'Ajanlat').replace(/[^\w\sÁÉÍÓÖŐÚÜŰáéíóöőúüű]/g, '').trim().replace(/\s+/g, '_');
    const filename = `Ajanlat_${safeName}.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (err) {
    console.error('PDF generation error:', err);
    return Response.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}

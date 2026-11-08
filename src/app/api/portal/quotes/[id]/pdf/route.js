import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateOfferPdf } from '@/lib/generateOfferPdf';

// Client-accessible PDF download for portal quotes.
// Auth: OTP session (the client's email must match the quote's client record)
// SA: superadmin can download any portal-visible quote.
export async function GET(request, { params }) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  const isSuperAdmin = profile?.role === 'superadmin';

  const { data: quote } = await admin
    .from('quotes')
    .select('id, title, offer_number, client_id, owner_id, portal_visible')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 });

  if (!isSuperAdmin) {
    if (!quote.portal_visible) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { data: clientRecord } = await admin
      .from('clients').select('email').eq('id', quote.client_id).is('deleted_at', null).single();
    if (!clientRecord || clientRecord.email.toLowerCase() !== user.email.toLowerCase()) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const pdfBuffer = await generateOfferPdf(id, quote.owner_id, '#2563eb');
    const safeName = (quote.offer_number || quote.title || 'Offer')
      .replace(/\//g, '-')
      .replace(/[^\w\sÁÉÍÓÖŐÚÜŰáéíóöőúüű -]/g, '')
      .trim().replace(/\s+/g, '_').slice(0, 60);
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Offer_${safeName}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (err) {
    console.error('[portal/pdf]', err);
    return Response.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}

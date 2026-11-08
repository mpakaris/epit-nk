import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateOfferPdf } from '@/lib/generateOfferPdf';
import { getPortalSession } from '@/lib/portalSession';

// Client-accessible PDF download for portal quotes.
// Auth: portal cookie session (regular clients) or Supabase auth (superadmin).
export async function GET(request, { params }) {
  const { id } = await params;
  const admin = createAdminClient();

  let clientEmail = null;
  let isSuperAdmin = false;

  const session = await getPortalSession();
  if (session) {
    clientEmail = session.email;
  } else {
    // Fallback: superadmin via Supabase auth
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'superadmin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    isSuperAdmin = true;
  }

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
    if (!clientRecord || clientRecord.email.toLowerCase() !== clientEmail) {
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

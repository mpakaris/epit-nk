import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateOfferPdf } from '@/lib/generateOfferPdf';

export async function GET(request, { params }) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: quote } = await admin.from('quotes').select('title, owner_id, collective_id').eq('id', id).single();
  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: profile } = await admin.from('profiles').select('role, active_collective_id').eq('id', user.id).single();
  const isOwner = quote.owner_id === user.id;
  const isSuperAdmin = profile?.role === 'superadmin';
  const isCollMember = quote.collective_id && profile?.active_collective_id === quote.collective_id;
  if (!isOwner && !isSuperAdmin && !isCollMember) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const pdfBuffer = await generateOfferPdf(id, cookieHeader);

    const safe = (quote.title || 'Ajanlat').replace(/[^\w\sÁÉÍÓÖŐÚÜŰáéíóöőúüű]/g, '').trim().replace(/\s+/g, '_');
    const filename = `Ajanlat_${safe}.pdf`;

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

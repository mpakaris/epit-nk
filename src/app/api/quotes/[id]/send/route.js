import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { EMAIL_TEMPLATES, fillTemplate, wrapEmail, buildOfferDetailHtml } from '@/lib/emailTemplates';
import { generateOfferPdf } from '@/lib/generateOfferPdf';

export async function POST(request, { params }) {
  const { id } = await params;
  const cookieHeader = request.headers.get('cookie') || '';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const attachTerms = body.attachTerms !== false; // default true

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, display_name, terms_pdf_url, terms_pdf_name').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { data: quote } = await admin
    .from('quotes')
    .select('*, quote_sections(*, quote_entries(*))')
    .eq('id', id)
    .single();
  if (!quote) return Response.json({ error: 'Ajánlat nem található' }, { status: 404 });

  const isSuperAdmin = profile.role === 'superadmin';
  const isOwner = quote.owner_id === user.id || quote.created_by === user.id;
  if (!isSuperAdmin && !isOwner) return Response.json({ error: 'Nincs hozzáférés' }, { status: 403 });

  if (!quote.client_id) return Response.json({ error: 'Nincs ügyfél rendelve az ajánlathoz' }, { status: 400 });
  const { data: client } = await admin.from('clients').select('name, email').eq('id', quote.client_id).single();
  if (!client?.email) return Response.json({ error: 'Az ügyfélnek nincs megadva email cím' }, { status: 400 });

  // Totals for email body
  const allEntries = (quote.quote_sections || []).flatMap(s => s.quote_entries || []);
  const netTotal   = allEntries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  const taxRate    = Number(quote.tax_percent ?? 27);
  const taxAmount  = Math.round(netTotal * taxRate / 100);
  const grossTotal = netTotal + taxAmount;

  const tpl = EMAIL_TEMPLATES.offer_sent;
  const sections = quote.quote_sections || [];
  const vars = {
    client_name:        client.name,
    offer_title:        quote.title,
    offer_summary_html: buildOfferDetailHtml({
      sections,
      allEntries,
      netTotal, taxRate, taxAmount, grossTotal,
      validUntil: quote.valid_until,
    }),
    sender_name:        profile.display_name || '',
  };

  const subject = fillTemplate(tpl.subject, vars);
  const html    = wrapEmail(fillTemplate(tpl.bodyHtml, vars), `Árajánlat: ${quote.title}`);

  // Generate PDF from the real print page
  let pdfBuffer;
  try {
    pdfBuffer = await generateOfferPdf(id, cookieHeader);
  } catch (err) {
    return Response.json({ error: `PDF generálási hiba: ${err.message}` }, { status: 500 });
  }

  const safeTitle = quote.title.replace(/[^a-zA-Z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ\s-]/g, '').trim().replace(/\s+/g, '_');

  // Fetch terms PDF if user has one and it's requested
  const attachments = [{ filename: `Ajanlat_${safeTitle}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }];
  if (attachTerms && profile.terms_pdf_url) {
    try {
      const termRes = await fetch(profile.terms_pdf_url);
      if (termRes.ok) {
        const termBuf = Buffer.from(await termRes.arrayBuffer());
        attachments.push({ filename: profile.terms_pdf_name || 'ASZF.pdf', content: termBuf, contentType: 'application/pdf' });
      }
    } catch { /* skip if fetch fails */ }
  }

  try {
    await sendEmail({
      to: client.email,
      cc: user.email || undefined,
      replyTo: user.email || undefined,
      subject,
      html,
      attachments,
    });
  } catch (err) {
    return Response.json({ error: `Email küldési hiba: ${err.message}` }, { status: 500 });
  }

  const { data: updated, error: updateErr } = await admin
    .from('quotes')
    .update({ status: 'sent' })
    .eq('id', id)
    .select()
    .single();
  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });

  return Response.json({ ok: true, quote: updated, sentTo: client.email });
}

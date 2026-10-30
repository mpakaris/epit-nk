import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { createAdminClient } from '@/lib/supabase/admin';
import { OfferPdfTemplate } from '@/lib/OfferPdfTemplate';

/**
 * Fetch all required data from the DB and render the offer as a PDF buffer.
 * No Puppeteer, no auth cookies, no AppContext — pure server-side.
 *
 * @param {string} quoteId
 * @param {string} userId   — used to fetch the contractor's profile
 * @returns {Promise<Buffer>}
 */
export async function generateOfferPdf(quoteId, userId, accentColor = '#2563eb') {
  const admin = createAdminClient();

  const [quoteRes, profileRes] = await Promise.all([
    admin
      .from('quotes')
      .select('*, quote_sections(*, quote_entries(*))')
      .eq('id', quoteId)
      .single(),
    admin
      .from('profiles')
      .select('display_name, first_name, last_name, company_name, street, street_number, zip, city, tax_number')
      .eq('id', userId)
      .single(),
  ]);

  if (quoteRes.error || !quoteRes.data) throw new Error('Ajánlat nem található');
  const quote = quoteRes.data;
  const profile = profileRes.data || {};

  const client = quote.client_id
    ? (await admin.from('clients').select('name, email, phone, address').eq('id', quote.client_id).single()).data
    : null;

  const sections = (quote.quote_sections || [])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const allEntries = sections.flatMap(s => s.quote_entries || []);

  const buffer = await renderToBuffer(
    React.createElement(OfferPdfTemplate, { quote, client, sections, allEntries, profile, accentColor })
  );

  return Buffer.from(buffer);
}

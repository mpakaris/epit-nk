import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import PrintQuote from '@/app/[locale]/naplo/[id]/ajanlat/PrintQuote';

export default async function ClientQuotePrintPage({ params }) {
  const { id: clientId, quoteId } = await params;
  const admin = createAdminClient();

  const { data: client } = await admin.from('clients').select('*').eq('id', clientId).single();
  if (!client) notFound();

  const { data: quote } = await admin
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .eq('client_id', clientId)
    .single();

  if (!quote) notFound();

  const { data: entries } = await admin
    .from('quote_entries')
    .select('*')
    .eq('quote_id', quoteId)
    .order('created_at');

  const { data: ownerProfile } = client.owner_id
    ? await admin.from('profiles').select('id, display_name, company_name').eq('id', client.owner_id).single()
    : { data: null };
  const entity = { id: client.owner_id, name: ownerProfile?.company_name || ownerProfile?.display_name || null };

  // PrintQuote expects a project shape — we synthesise a minimal one from the quote
  const syntheticProject = {
    id: quote.id,
    name: quote.title,
    description: quote.description,
    start_date: quote.start_date,
    end_date: quote.end_date,
    client_id: clientId,
    owner_id: client.owner_id,
  };

  return (
    <PrintQuote
      project={syntheticProject}
      quote={{ ...quote, entries: entries || [] }}
      client={client}
      entity={entity}
    />
  );
}

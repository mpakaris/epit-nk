import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import PrintQuote from '@/app/naplo/[id]/ajanlat/PrintQuote';

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

  const { data: entity } = await admin
    .from('entities').select('id, name').eq('id', client.entity_id).single();

  // PrintQuote expects a project shape — we synthesise a minimal one from the quote
  const syntheticProject = {
    id: quote.id,
    name: quote.title,
    description: quote.description,
    start_date: quote.start_date,
    end_date: quote.end_date,
    client_id: clientId,
    entity_id: client.entity_id,
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

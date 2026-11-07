import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import PrintQuote from './PrintQuote';

export default async function QuotePrintPage({ params }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: project } = await admin
    .from('projects')
    .select('id, name, description, start_date, end_date, client_id, owner_id')
    .eq('id', id)
    .single();

  if (!project) notFound();

  const { data: ownerProfile } = project.owner_id
    ? await admin.from('profiles').select('id, display_name, company_name').eq('id', project.owner_id).single()
    : { data: null };
  const entity = { id: project.owner_id, name: ownerProfile?.company_name || ownerProfile?.display_name || null };

  const { data: quoteRow } = await admin
    .from('quotes')
    .select('*')
    .eq('project_id', id)
    .limit(1)
    .maybeSingle();

  if (!quoteRow) {
    return (
      <div style={{ maxWidth: 680, margin: '4rem auto', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ color: '#666', fontSize: '1rem' }}>Ehhez a projekthez nem tartozik ajánlat.</p>
        <a href={`/naplo/${id}`} style={{ color: '#2563eb', fontSize: '0.9rem' }}>← Vissza</a>
      </div>
    );
  }

  const { data: entries } = await admin
    .from('quote_entries')
    .select('*')
    .eq('quote_id', quoteRow.id)
    .order('created_at');

  let client = null;
  if (project.client_id) {
    const { data: c } = await admin.from('clients').select('*').eq('id', project.client_id).single();
    client = c || null;
  }

  return (
    <PrintQuote
      project={project}
      quote={{ ...quoteRow, entries: entries || [] }}
      client={client}
      entity={entity}
    />
  );
}

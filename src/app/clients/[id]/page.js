import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import ClientPortal from './ClientPortal';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: client } = await admin.from('clients').select('name').eq('id', id).single();
  return { title: client ? `${client.name} – Ügyfél portál` : 'Ügyfél portál' };
}

export default async function ClientPortalPage({ params }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: client } = await admin.from('clients').select('*').eq('id', id).single();
  if (!client) notFound();

  const { data: entity } = await admin
    .from('entities').select('id, name').eq('id', client.entity_id).single();

  // Non-draft quotes for this client, newest first
  const { data: rawQuotes } = await admin
    .from('quotes')
    .select('*')
    .eq('client_id', id)
    .neq('status', 'draft')
    .order('created_at', { ascending: false });

  const quotes = rawQuotes || [];
  const quoteIds = quotes.map(q => q.id);

  const { data: quoteEntries } = quoteIds.length > 0
    ? await admin.from('quote_entries').select('*').in('quote_id', quoteIds).order('created_at')
    : { data: [] };

  // Quote sections (rooms)
  const { data: rawSections } = quoteIds.length > 0
    ? await admin.from('quote_sections').select('*').in('quote_id', quoteIds).order('sort_order').order('created_at')
    : { data: [] };

  const sections = rawSections || [];
  const surveyEntryIds = [...new Set(sections.map(s => s.survey_entry_id).filter(Boolean))];

  // Room photos via survey_media
  const { data: rawRoomPhotos } = surveyEntryIds.length > 0
    ? await admin.from('survey_media')
        .select('id, entry_id, drive_view_url, thumbnail_url, mime_type')
        .in('entry_id', surveyEntryIds)
        .eq('media_type', 'photo')
        .order('created_at')
    : { data: [] };

  const roomPhotos = rawRoomPhotos || [];

  // All projects for this client
  const { data: rawProjects } = await admin
    .from('projects')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false });

  const projects = rawProjects || [];
  const projectIds = projects.map(p => p.id);

  // Invoice totals
  const { data: invoices } = projectIds.length > 0
    ? await admin.from('invoices').select('project_id, value_huf').in('project_id', projectIds)
    : { data: [] };

  // Public diary entries
  const { data: rawEntries } = projectIds.length > 0
    ? await admin.from('diary_entries')
        .select('id, project_id, title, body, work_type, client_note, entry_date, created_at, created_by')
        .in('project_id', projectIds)
        .eq('is_public', true)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
    : { data: [] };

  const diaryEntries = rawEntries || [];
  const entryIds = diaryEntries.map(e => e.id);

  // Photos for those diary entries
  const { data: rawPhotos } = entryIds.length > 0
    ? await admin.from('diary_photos')
        .select('id, entry_id, drive_view_url, thumbnail_url, mime_type')
        .in('entry_id', entryIds)
        .order('created_at')
    : { data: [] };

  const photos = rawPhotos || [];

  // Author names
  const creatorIds = [...new Set(diaryEntries.map(e => e.created_by).filter(Boolean))];
  let authorMap = {};
  if (creatorIds.length > 0) {
    const { data: authors } = await admin.from('profiles').select('id, display_name').in('id', creatorIds);
    for (const a of (authors || [])) authorMap[a.id] = a.display_name;
  }

  const enrichedEntries = diaryEntries.map(e => ({
    ...e,
    author_name: authorMap[e.created_by] || null,
    photos: photos.filter(p => p.entry_id === e.id),
  }));

  // Attach entries and invoice totals to projects
  const enrichedProjects = projects.map(p => ({
    ...p,
    invoiceTotal: (invoices || []).filter(inv => inv.project_id === p.id).reduce((s, inv) => s + Number(inv.value_huf || 0), 0),
    diaryEntries: enrichedEntries.filter(e => e.project_id === p.id),
    linkedQuote: quotes.find(q => q.project_id === p.id) || null,
  }));

  const enrichedQuotes = quotes.map(q => ({
    ...q,
    entries: (quoteEntries || []).filter(e => e.quote_id === q.id),
    sections: sections
      .filter(s => s.quote_id === q.id)
      .map(s => ({
        ...s,
        photos: roomPhotos.filter(p => p.entry_id === s.survey_entry_id),
        entries: (quoteEntries || []).filter(e => e.quote_id === q.id && e.section_id === s.id),
      })),
  }));

  return (
    <ClientPortal
      client={client}
      entity={entity}
      quotes={enrichedQuotes}
      projects={enrichedProjects}
    />
  );
}

import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import ClientDiaryView from './ClientDiaryView';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: project } = await admin.from('projects').select('name').eq('id', id).single();
  return {
    title: project ? `${project.name} – Projekt napló` : 'Projekt napló',
  };
}

export default async function PublicProjectDiaryPage({ params }) {
  const { id } = await params;
  const admin = createAdminClient();

  // Fetch project
  const { data: project } = await admin
    .from('projects')
    .select('id, name, description, start_date, end_date, client_id, entity_id')
    .eq('id', id)
    .single();

  if (!project) notFound();

  // Fetch entity (for branding)
  const { data: entity } = await admin
    .from('entities')
    .select('id, name')
    .eq('id', project.entity_id)
    .single();

  // Fetch client
  let client = null;
  if (project.client_id) {
    const { data: c } = await admin
      .from('clients')
      .select('id, name, address, phone, email')
      .eq('id', project.client_id)
      .single();
    client = c || null;
  }

  // Fetch only PUBLIC diary entries
  const { data: entries } = await admin
    .from('diary_entries')
    .select('id, title, body, work_type, client_note, entry_date, created_at, created_by')
    .eq('project_id', id)
    .eq('is_public', true)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  const entryIds = (entries || []).map(e => e.id);
  let photos = [];
  if (entryIds.length > 0) {
    const { data: p } = await admin
      .from('diary_photos')
      .select('id, entry_id, drive_view_url, thumbnail_url, mime_type')
      .in('entry_id', entryIds)
      .order('created_at');
    photos = p || [];
  }

  // Fetch author names
  const creatorIds = [...new Set((entries || []).map(e => e.created_by).filter(Boolean))];
  let authorMap = {};
  if (creatorIds.length > 0) {
    const { data: authors } = await admin.from('profiles').select('id, display_name').in('id', creatorIds);
    for (const a of (authors || [])) authorMap[a.id] = a.display_name;
  }

  const enrichedEntries = (entries || []).map(e => ({
    ...e,
    author_name: authorMap[e.created_by] || null,
    photos: photos.filter(p => p.entry_id === e.id),
  }));

  return (
    <ClientDiaryView
      project={project}
      client={client}
      entity={entity}
      entries={enrichedEntries}
    />
  );
}

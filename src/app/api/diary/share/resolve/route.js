import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/diary/share/resolve?token=X — public, no auth required
// Returns project diary entries for a valid share token
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tokenValue = searchParams.get('token');
  if (!tokenValue) return Response.json({ error: 'Missing token' }, { status: 400 });

  const admin = createAdminClient();

  const now = new Date().toISOString();
  const { data: tokenRow } = await admin
    .from('diary_share_tokens')
    .select('id, project_id, entity_id, label, expires_at')
    .eq('token', tokenValue)
    .single();

  if (!tokenRow) return Response.json({ error: 'invalid_token' }, { status: 404 });
  if (tokenRow.expires_at && tokenRow.expires_at < now) return Response.json({ error: 'expired_token' }, { status: 410 });

  const { project_id, entity_id } = tokenRow;

  // Fetch project info
  const { data: project } = await admin.from('projects').select('id, name, description').eq('id', project_id).eq('entity_id', entity_id).single();
  if (!project) return Response.json({ error: 'invalid_token' }, { status: 404 });

  // Fetch diary entries with photos — always entity-scoped
  const { data: entries } = await admin
    .from('diary_entries')
    .select('id, title, body, work_type, client_note, entry_date, created_at, created_by')
    .eq('project_id', project_id)
    .eq('entity_id', entity_id)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  const entryIds = (entries || []).map(e => e.id);
  let photos = [];
  if (entryIds.length > 0) {
    const { data: p } = await admin
      .from('diary_photos')
      .select('id, entry_id, drive_view_url, thumbnail_url, mime_type')
      .in('entry_id', entryIds)
      .eq('entity_id', entity_id)
      .order('created_at');
    photos = p || [];
  }

  // Fetch author names — only display_name, no sensitive data
  const creatorIds = [...new Set((entries || []).map(e => e.created_by).filter(Boolean))];
  let authorMap = {};
  if (creatorIds.length > 0) {
    const { data: authors } = await admin.from('profiles').select('id, display_name').in('id', creatorIds);
    for (const a of (authors || [])) authorMap[a.id] = a.display_name;
  }

  const entriesWithPhotos = (entries || []).map(e => ({
    id: e.id,
    title: e.title,
    body: e.body,
    work_type: e.work_type,
    client_note: e.client_note,
    entry_date: e.entry_date,
    created_at: e.created_at,
    author_name: authorMap[e.created_by] || null,
    photos: photos.filter(p => p.entry_id === e.id),
  }));

  return Response.json({
    project: { id: project.id, name: project.name, description: project.description },
    entries: entriesWithPhotos,
    token_label: tokenRow.label,
  });
}

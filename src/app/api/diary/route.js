import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function getCallerProfile(supabase, admin) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Unauthenticated', status: 401 };
  const { data: profile } = await admin.from('profiles').select('id, role, entity_id, display_name').eq('id', user.id).single();
  if (!profile) return { error: 'Profile not found', status: 403 };
  // Superadmin allowed — entity_id resolved per-project in each handler
  if (profile.role !== 'superadmin' && !profile.entity_id) return { error: 'No entity assigned', status: 400 };
  return { profile };
}

// Resolve the entity_id for a project, respecting superadmin's cross-entity access
async function resolveEntityId(admin, projectId, profile) {
  if (profile.role === 'superadmin') {
    const { data: p } = await admin.from('projects').select('entity_id').eq('id', projectId).single();
    return p?.entity_id || null;
  }
  return profile.entity_id;
}

// GET /api/diary?project_id=X — list entries with photos, entity-scoped
export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { profile, error, status } = await getCallerProfile(supabase, admin);
  if (error) return Response.json({ error }, { status });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');
  if (!projectId) return Response.json({ error: 'Missing project_id' }, { status: 400 });

  const entityId = await resolveEntityId(admin, projectId, profile);
  if (!entityId) return Response.json({ error: 'Project not found' }, { status: 404 });

  // Verify project exists and belongs to the resolved entity
  const { data: project } = await admin.from('projects').select('id').eq('id', projectId).eq('entity_id', entityId).single();
  if (!project) return Response.json({ error: 'Project not found or access denied' }, { status: 404 });

  const { data: entries, error: entriesErr } = await admin
    .from('diary_entries')
    .select('*')
    .eq('project_id', projectId)
    .eq('entity_id', entityId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (entriesErr) return Response.json({ error: entriesErr.message }, { status: 500 });

  const entryIds = (entries || []).map(e => e.id);
  let photos = [];
  if (entryIds.length > 0) {
    const { data: p } = await admin
      .from('diary_photos')
      .select('*')
      .in('entry_id', entryIds)
      .eq('entity_id', entityId)
      .order('created_at');
    photos = p || [];
  }

  const entriesWithPhotos = (entries || []).map(e => ({
    ...e,
    photos: photos.filter(p => p.entry_id === e.id),
  }));

  return Response.json({ entries: entriesWithPhotos });
}

// POST /api/diary — create entry
export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { profile, error, status } = await getCallerProfile(supabase, admin);
  if (error) return Response.json({ error }, { status });

  const body = await request.json();
  const { project_id, title, body: entryBody, entry_date, photo_ids, work_type, internal_note, client_note, is_public } = body;

  if (!project_id || !title?.trim()) return Response.json({ error: 'project_id és title kötelező' }, { status: 400 });

  const entityId = await resolveEntityId(admin, project_id, profile);
  if (!entityId) return Response.json({ error: 'Project not found' }, { status: 404 });

  const { data: project } = await admin.from('projects').select('id, entity_id').eq('id', project_id).eq('entity_id', entityId).single();
  if (!project) return Response.json({ error: 'Project not found or access denied' }, { status: 404 });

  const { data: entry, error: insertErr } = await admin.from('diary_entries').insert([{
    project_id,
    entity_id: entityId,
    created_by: profile.id,
    title: title.trim(),
    body: entryBody || null,
    entry_date: entry_date || new Date().toISOString().split('T')[0],
    work_type: work_type?.trim() || null,
    internal_note: internal_note?.trim() || null,
    client_note: client_note?.trim() || null,
    is_public: Boolean(is_public),
  }]).select().single();

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

  let photos = [];
  if (Array.isArray(photo_ids) && photo_ids.length > 0) {
    await admin.from('diary_photos')
      .update({ entry_id: entry.id })
      .in('id', photo_ids)
      .eq('entity_id', entityId);
    const { data: linkedPhotos } = await admin
      .from('diary_photos')
      .select('*')
      .in('id', photo_ids)
      .eq('entity_id', entityId)
      .order('created_at');
    photos = linkedPhotos || [];
  }

  logAudit({
    entityId,
    userId: profile.id,
    userName: profile.display_name,
    action: 'diary_entry_created',
    targetType: 'diary_entry',
    targetId: entry.id,
    targetName: title.trim(),
    details: { project_id },
  });

  return Response.json({ entry: { ...entry, photos } }, { status: 201 });
}

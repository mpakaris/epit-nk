import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function getCallerAndProject(admin, userId, projectId) {
  const { data: profile } = await admin.from('profiles').select('id, role, display_name').eq('id', userId).single();
  if (!profile) return { err: 'Profile not found', status: 403 };

  const { data: project } = await admin.from('projects').select('id, owner_id, collective_id, created_by').eq('id', projectId).single();
  if (!project) return { err: 'Project not found', status: 404 };

  if (profile.role === 'superadmin') return { profile, project };

  const isOwner = project.owner_id === userId || project.created_by === userId;
  if (isOwner) return { profile, project };

  if (project.collective_id) {
    const { data: mem } = await admin.from('collective_members').select('role').eq('collective_id', project.collective_id).eq('user_id', userId).eq('status', 'active').maybeSingle();
    if (mem) return { profile, project };
  }

  return { err: 'Forbidden', status: 403 };
}

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');
  if (!projectId) return Response.json({ error: 'Missing project_id' }, { status: 400 });

  const admin = createAdminClient();
  const ctx = await getCallerAndProject(admin, user.id, projectId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { data: entries, error: entriesErr } = await admin
    .from('diary_entries')
    .select('*')
    .eq('project_id', projectId)
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
      .order('created_at');
    photos = p || [];
  }

  const entriesWithPhotos = (entries || []).map(e => ({
    ...e,
    photos: photos.filter(p => p.entry_id === e.id),
  }));

  return Response.json({ entries: entriesWithPhotos });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await request.json();
  const { project_id, title, body: entryBody, entry_date, photo_ids, work_type, internal_note, client_note, is_public, room_id } = body;
  if (!project_id || !title?.trim()) return Response.json({ error: 'project_id és title kötelező' }, { status: 400 });

  const admin = createAdminClient();
  const ctx = await getCallerAndProject(admin, user.id, project_id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { data: entry, error: insertErr } = await admin.from('diary_entries').insert([{
    project_id,
    created_by:    user.id,
    author_name:   ctx.profile.display_name || null,
    title:         title.trim(),
    body:          entryBody || null,
    entry_date:    entry_date || new Date().toISOString().split('T')[0],
    work_type:     work_type?.trim() || null,
    internal_note: internal_note?.trim() || null,
    client_note:   client_note?.trim() || null,
    is_public:     Boolean(is_public),
    room_id:       room_id || null,
  }]).select().single();

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

  let photos = [];
  if (Array.isArray(photo_ids) && photo_ids.length > 0) {
    await admin.from('diary_photos').update({ entry_id: entry.id }).in('id', photo_ids);
    const { data: linkedPhotos } = await admin.from('diary_photos').select('*').in('id', photo_ids).order('created_at');
    photos = linkedPhotos || [];
  }

  logAudit({
    entityId: ctx.project.collective_id || user.id,
    userId:   user.id,
    userName: ctx.profile.display_name,
    action:   'diary_entry_created',
    targetType: 'diary_entry',
    targetId:   entry.id,
    targetName: title.trim(),
    details: { project_id },
  });

  return Response.json({ entry: { ...entry, photos } }, { status: 201 });
}

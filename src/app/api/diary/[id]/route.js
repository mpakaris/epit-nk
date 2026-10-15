import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function getAuth(supabase, admin) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: 'Unauthenticated', status: 401 };
  const { data: profile } = await admin.from('profiles').select('id, role, display_name').eq('id', user.id).single();
  if (!profile) return { error: 'Profile not found', status: 403 };
  return { user, profile };
}

async function resolveEntry(entryId, userId, profile, admin) {
  const { data: entry } = await admin.from('diary_entries')
    .select('id, title, project_id, created_by')
    .eq('id', entryId)
    .single();
  if (!entry) return null;
  if (profile.role === 'superadmin') return entry;
  // Verify user can access the project
  const { data: project } = await admin.from('projects').select('owner_id, collective_id, created_by').eq('id', entry.project_id).single();
  if (!project) return null;
  const isOwner = project.owner_id === userId || project.created_by === userId;
  if (isOwner) return entry;
  if (project.collective_id) {
    const { data: mem } = await admin.from('collective_members').select('collective_id').eq('collective_id', project.collective_id).eq('user_id', userId).eq('status', 'active').maybeSingle();
    if (mem) return entry;
  }
  return null;
}

// PATCH /api/diary/[id] — admin or superadmin only
export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { user, profile, error, status } = await getAuth(supabase, admin);
  if (error) return Response.json({ error }, { status });

  const isSuperAdmin = profile.role === 'superadmin';
  const isAdminRole = profile.role === 'admin';
  const entry = await resolveEntry(id, user.id, profile, admin);
  if (!entry) return Response.json({ error: 'Entry not found or access denied' }, { status: 404 });

  const body = await request.json();
  const { title, body: entryBody, work_type, internal_note, client_note, entry_date, add_photo_ids, is_public } = body;
  if (!title?.trim()) return Response.json({ error: 'A cím nem lehet üres' }, { status: 400 });

  const { data: updated, error: updateErr } = await admin.from('diary_entries')
    .update({
      title: title.trim(),
      body: entryBody?.trim() || null,
      work_type: work_type?.trim() || null,
      internal_note: internal_note?.trim() || null,
      client_note: client_note?.trim() || null,
      entry_date: entry_date || undefined,
      is_public: typeof is_public === 'boolean' ? is_public : undefined,
    })
    .eq('id', id)
    .eq('entity_id', entityId)
    .select()
    .single();

  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });

  if (Array.isArray(add_photo_ids) && add_photo_ids.length > 0) {
    await admin.from('diary_photos')
      .update({ entry_id: id })
      .in('id', add_photo_ids)
      .eq('entity_id', entityId);
  }

  const { data: photos } = await admin
    .from('diary_photos')
    .select('*')
    .eq('entry_id', id)
    .eq('entity_id', entityId)
    .order('created_at');

  logAudit({
    entityId,
    userId: profile.id,
    userName: profile.display_name,
    action: 'diary_entry_updated',
    targetType: 'diary_entry',
    targetId: id,
    targetName: title.trim(),
  });

  return Response.json({ entry: { ...updated, photos: photos || [] } });
}

// DELETE /api/diary/[id] — admin, superadmin, or entry owner
export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { user, profile, error, status } = await getAuth(supabase, admin);
  if (error) return Response.json({ error }, { status });

  const isSuperAdmin = profile.role === 'superadmin';
  const entry = await resolveEntry(id, user.id, profile, admin);
  if (!entry) return Response.json({ error: 'Entry not found or access denied' }, { status: 404 });

  const isOwner = entry.created_by === user.id;
  if (!isSuperAdmin && !isOwner) {
    return Response.json({ error: 'Nincs jogosultsága törölni ezt a bejegyzést' }, { status: 403 });
  }

  const { error: delErr } = await admin.from('diary_entries').delete().eq('id', id);
  if (delErr) return Response.json({ error: delErr.message }, { status: 500 });

  logAudit({
    entityId: entry.entity_id,
    userId: profile.id,
    userName: profile.display_name,
    action: 'diary_entry_deleted',
    targetType: 'diary_entry',
    targetId: id,
    targetName: entry.title,
  });

  return Response.json({ success: true });
}

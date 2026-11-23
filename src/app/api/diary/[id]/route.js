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
    .is('deleted_at', null)
    .single();
  if (!entry) return null;
  if (profile.role === 'superadmin') return { ...entry, isKollektivOwner: true };
  // Verify user can access the project
  const { data: project } = await admin.from('projects').select('owner_id, collective_id, created_by').eq('id', entry.project_id).is('deleted_at', null).single();
  if (!project) return null;
  const isProjectOwner = project.owner_id === userId || project.created_by === userId;
  if (isProjectOwner) return { ...entry, isKollektivOwner: true };
  if (project.collective_id) {
    const { data: mem } = await admin.from('collective_members').select('role').eq('collective_id', project.collective_id).eq('user_id', userId).eq('status', 'active').maybeSingle();
    if (mem) return { ...entry, isKollektivOwner: mem.role === 'owner' || mem.role === 'admin' };
  }
  return null;
}

// PATCH /api/diary/[id] — collective owner/admin or entry creator
export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { user, profile, error, status } = await getAuth(supabase, admin);
  if (error) return Response.json({ error }, { status });

  const isSuperAdmin = profile.role === 'superadmin';
  const entry = await resolveEntry(id, user.id, profile, admin);
  if (!entry) return Response.json({ error: 'Entry not found or access denied' }, { status: 404 });

  const isCreator = entry.created_by === user.id;
  if (!isSuperAdmin && !entry.isKollektivOwner && !isCreator) {
    logAudit({ entityId: entry.project_id, userId: user.id, userName: profile.display_name, action: 'Diary entry edit denied', targetType: 'diary_entry', targetId: id, details: { error: 'Permission denied' } });
    return Response.json({ error: 'Nincs jogosultsága szerkeszteni ezt a bejegyzést.' }, { status: 403 });
  }

  const body = await request.json();
  const { title, body: entryBody, work_type, internal_note, client_note, entry_date, add_photo_ids, is_public, room_id } = body;

  const updateFields = {};
  if ('title'         in body) updateFields.title         = title?.trim();
  if ('body'          in body) updateFields.body          = entryBody?.trim() || null;
  if ('work_type'     in body) updateFields.work_type     = work_type?.trim() || null;
  if ('internal_note' in body) updateFields.internal_note = internal_note?.trim() || null;
  if ('client_note'   in body) updateFields.client_note   = client_note?.trim() || null;
  if ('entry_date'    in body) updateFields.entry_date    = entry_date || undefined;
  if ('is_public'     in body) updateFields.is_public     = typeof is_public === 'boolean' ? is_public : undefined;
  if ('room_id'       in body) updateFields.room_id       = room_id || null;

  if ('title' in updateFields && !updateFields.title)
    return Response.json({ error: 'A cím nem lehet üres' }, { status: 400 });

  let updated = entry;
  if (Object.keys(updateFields).length) {
    const { data, error: updateErr } = await admin.from('diary_entries')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();
    if (updateErr) {
      logAudit({ entityId: entry.project_id, userId: user.id, userName: profile.display_name, action: 'Diary entry update failed', targetType: 'diary_entry', targetId: id, details: { error: updateErr.message } });
      return Response.json({ error: updateErr.message }, { status: 500 });
    }
    updated = data;
  }

  if (Array.isArray(add_photo_ids) && add_photo_ids.length > 0) {
    await admin.from('diary_photos').update({ entry_id: id }).in('id', add_photo_ids);
  }

  const { data: photos } = await admin
    .from('diary_photos').select('*').eq('entry_id', id).order('created_at');

  const wasVisibilityChange = typeof is_public === 'boolean' && is_public !== entry.is_public;
  const auditAction = wasVisibilityChange
    ? (is_public ? 'Diary entry published to client' : 'Diary entry hidden from client')
    : 'Napló bejegyzés módosítva';

  logAudit({
    entityId: entry.project_id,
    userId: profile.id,
    userName: profile.display_name,
    action: auditAction,
    targetType: 'diary_entry',
    targetId: id,
    targetName: updated.title || entry.title,
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

  const isCreator = entry.created_by === user.id;
  if (!isSuperAdmin && !entry.isKollektivOwner && !isCreator) {
    return Response.json({ error: 'Nincs jogosultsága törölni ezt a bejegyzést' }, { status: 403 });
  }

  const { error: delErr } = await admin.from('diary_entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (delErr) {
    logAudit({ entityId: entry.project_id, userId: user.id, userName: profile.display_name, action: 'Diary entry deletion failed', targetType: 'diary_entry', targetId: id, details: { error: delErr.message } });
    return Response.json({ error: delErr.message }, { status: 500 });
  }

  logAudit({
    entityId: entry.project_id,
    userId: profile.id,
    userName: profile.display_name,
    action: 'Napló bejegyzés törölve',
    targetType: 'diary_entry',
    targetId: id,
    targetName: entry.title,
  });

  return Response.json({ success: true });
}

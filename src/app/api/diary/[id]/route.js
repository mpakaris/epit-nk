import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function getAuth(supabase, admin) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: 'Unauthenticated', status: 401 };
  const { data: profile } = await admin.from('profiles').select('id, role, entity_id, display_name').eq('id', user.id).single();
  if (!profile) return { error: 'Profile not found', status: 403 };
  return { user, profile };
}

async function resolveEntry(entryId, profile, admin) {
  const query = admin.from('diary_entries')
    .select('id, title, project_id, entity_id, created_by')
    .eq('id', entryId);
  // Superadmin can access any entry; others are scoped to their entity
  if (profile.role !== 'superadmin') query.eq('entity_id', profile.entity_id);
  const { data: entry } = await query.single();
  return entry;
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
  if (!isSuperAdmin && !isAdminRole) return Response.json({ error: 'Csak admin szerkeszthet bejegyzést' }, { status: 403 });
  if (!isSuperAdmin && !profile.entity_id) return Response.json({ error: 'No entity assigned' }, { status: 400 });

  const entry = await resolveEntry(id, profile, admin);
  if (!entry) return Response.json({ error: 'Entry not found or access denied' }, { status: 404 });

  const entityId = entry.entity_id;

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
  if (!isSuperAdmin && !profile.entity_id) return Response.json({ error: 'No entity assigned' }, { status: 400 });

  const entry = await resolveEntry(id, profile, admin);
  if (!entry) return Response.json({ error: 'Entry not found or access denied' }, { status: 404 });

  const isAdminRole = ['admin'].includes(profile.role);
  const isOwner = entry.created_by === profile.id;
  if (!isSuperAdmin && !isAdminRole && !isOwner) {
    return Response.json({ error: 'Nincs jogosultsága törölni ezt a bejegyzést' }, { status: 403 });
  }

  const { error: delErr } = await admin.from('diary_entries').delete().eq('id', id).eq('entity_id', entry.entity_id);
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

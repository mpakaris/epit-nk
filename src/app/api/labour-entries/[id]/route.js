import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function resolveAccess(user, entryId) {
  const admin = createAdminClient();
  const [{ data: profile }, { data: entry }] = await Promise.all([
    admin.from('profiles').select('role, display_name').eq('id', user.id).single(),
    admin.from('labour_entries').select('id, project_id, uploaded_by').eq('id', entryId).single(),
  ]);
  if (!profile || !entry) return null;

  const { data: project } = await admin
    .from('projects')
    .select('id, owner_id, created_by, collective_id, name')
    .eq('id', entry.project_id)
    .single();
  if (!project) return null;

  const isSuperAdmin   = profile.role === 'superadmin';
  const isProjectOwner = project.owner_id === user.id || project.created_by === user.id;
  const isOwnEntry     = entry.uploaded_by === user.id;

  if (!isSuperAdmin && !isProjectOwner && !isOwnEntry) return null;

  return { admin, profile, entry, project };
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const ctx = await resolveAccess(user, id);
  if (!ctx) return Response.json({ error: 'Nincs hozzáférés' }, { status: 403 });
  const { admin, profile, entry, project } = ctx;

  const fields = await request.json();
  const allowed = ['labour_type', 'hours', 'hourly_rate', 'unit', 'date', 'description', 'room_id'];
  const update = {};
  for (const k of allowed) if (k in fields) update[k] = fields[k];

  if ('hours' in update || 'hourly_rate' in update) {
    const h = update.hours       ?? entry.hours       ?? 0;
    const r = update.hourly_rate ?? entry.hourly_rate ?? 0;
    update.value_huf = Math.round(Number(h) * Number(r));
  }

  const { data, error } = await admin.from('labour_entries').update(update).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  logAudit({
    entityId:   project.collective_id || user.id,
    userId:     user.id,
    userName:   profile.display_name || user.email,
    action:     'Munkabejegyzés módosítva',
    targetType: 'labour_entry',
    targetId:   id,
    targetName: project.name,
    details:    { labour_type: update.labour_type, value_huf: update.value_huf },
  });

  return Response.json({ labourEntry: data });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const ctx = await resolveAccess(user, id);
  if (!ctx) return Response.json({ error: 'Nincs hozzáférés' }, { status: 403 });
  const { admin, profile, project } = ctx;

  const { error } = await admin.from('labour_entries').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  logAudit({
    entityId:   project.collective_id || user.id,
    userId:     user.id,
    userName:   profile.display_name || user.email,
    action:     'Munkabejegyzés törölve',
    targetType: 'labour_entry',
    targetId:   id,
    targetName: project.name,
  });

  return Response.json({ ok: true });
}

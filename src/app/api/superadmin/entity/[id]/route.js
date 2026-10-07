import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function requireSuperAdmin(supabase, admin) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Unauthenticated', status: 401 };
  const { data: profile } = await admin.from('profiles').select('id, role, display_name').eq('id', user.id).single();
  if (profile?.role !== 'superadmin') return { error: 'Forbidden', status: 403 };
  return { profile };
}

// PATCH /api/superadmin/entity/[id] — update entity fields (superadmin only)
export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { profile, error, status } = await requireSuperAdmin(supabase, admin);
  if (error) return Response.json({ error }, { status });

  const body = await request.json();
  // Only allow specific fields to be updated
  const allowed = ['google_drive_folder_id', 'name'];
  const updates = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) return Response.json({ error: 'No valid fields to update' }, { status: 400 });

  const { data: entity, error: updateErr } = await admin.from('entities').update(updates).eq('id', id).select().single();
  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });

  logAudit({
    userId: profile.id,
    userName: profile.display_name,
    action: 'entity_updated',
    targetType: 'entity',
    targetId: id,
    details: updates,
  });

  return Response.json({ entity });
}

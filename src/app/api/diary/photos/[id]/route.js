import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteFromR2 } from '@/lib/r2';

// DELETE /api/diary/photos/[id] — admin or entry owner only
export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, entity_id')
    .eq('id', user.id)
    .single();

  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 403 });
  if (profile.role !== 'superadmin' && !profile.entity_id) return Response.json({ error: 'No entity assigned' }, { status: 400 });

  // Fetch photo + its entry to check ownership
  const photoQuery = admin
    .from('diary_photos')
    .select('id, drive_file_id, entry_id, entity_id')
    .eq('id', id);
  if (profile.role !== 'superadmin') photoQuery.eq('entity_id', profile.entity_id);
  const { data: photo } = await photoQuery.single();

  if (!photo) return Response.json({ error: 'Photo not found or access denied' }, { status: 404 });

  // Check permission: superadmin/admin can always delete; regular user only if they own the entry
  const isSuperAdmin = profile.role === 'superadmin';
  const isAdminRole = profile.role === 'admin';
  if (!isSuperAdmin && !isAdminRole && photo.entry_id) {
    const { data: entry } = await admin
      .from('diary_entries')
      .select('created_by')
      .eq('id', photo.entry_id)
      .single();
    if (!entry || entry.created_by !== profile.id) {
      return Response.json({ error: 'Nincs jogosultsága törölni ezt a fotót' }, { status: 403 });
    }
  }

  // Delete from R2 (drive_file_id stores the R2 object key)
  if (photo.drive_file_id) {
    try {
      await deleteFromR2(photo.drive_file_id);
    } catch {
      // Log but don't fail — orphaned R2 objects are preferable to DB inconsistency
    }
  }

  // Delete from DB
  const { error: delErr } = await admin
    .from('diary_photos')
    .delete()
    .eq('id', id)
    .eq('entity_id', profile.entity_id);

  if (delErr) return Response.json({ error: delErr.message }, { status: 500 });

  return Response.json({ success: true });
}

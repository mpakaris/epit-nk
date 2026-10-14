import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteFromR2 } from '@/lib/r2';

export async function DELETE(request, { params }) {
  const { id: itemId, fileId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    return Response.json({ error: 'Nincs jogosultság' }, { status: 403 });
  }

  const { data: file } = await admin
    .from('payment_item_files')
    .select('storage_path')
    .eq('id', fileId)
    .eq('item_id', itemId)
    .single();

  if (!file) return Response.json({ error: 'Fájl nem található' }, { status: 404 });

  if (file.storage_path) {
    try { await deleteFromR2(file.storage_path); } catch { /* continue even if R2 delete fails */ }
  }

  const { error } = await admin.from('payment_item_files').delete().eq('id', fileId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}

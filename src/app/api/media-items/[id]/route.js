import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeDeleteMediaItem } from '@/lib/mediaUsage';

export async function DELETE(request, { params }) {
  const { id: mediaItemId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  const { data: item } = await admin
    .from('media_items')
    .select('id, document_type, document_id')
    .eq('id', mediaItemId)
    .single();
  if (!item) return Response.json({ error: 'Not found' }, { status: 404 });

  // Verify user owns the document
  const table = item.document_type === 'quote' ? 'quotes' : 'projects';
  const { data: doc } = await admin
    .from(table).select('owner_id, created_by, collective_id').eq('id', item.document_id).single();
  if (!doc) return Response.json({ error: 'Not found' }, { status: 404 });

  const isOwner = doc.owner_id === user.id || doc.created_by === user.id;
  if (!isOwner) {
    if (!doc.collective_id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { data: mem } = await admin.from('collective_members')
      .select('role').eq('collective_id', doc.collective_id)
      .eq('user_id', user.id).eq('status', 'active').maybeSingle();
    if (!mem || (mem.role !== 'owner' && mem.role !== 'admin'))
      return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await safeDeleteMediaItem(admin, mediaItemId);
  return Response.json({ ok: true });
}

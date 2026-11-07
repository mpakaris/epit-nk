import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeDeleteMediaItem } from '@/lib/mediaUsage';
import { logAudit } from '@/lib/audit';

export async function PATCH(request, { params }) {
  const { id: mediaItemId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: item } = await admin
    .from('media_items')
    .select('id, document_type, document_id, portal_visible')
    .eq('id', mediaItemId)
    .single();
  if (!item) return Response.json({ error: 'Not found' }, { status: 404 });

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

  const { portal_visible } = await request.json();
  if (typeof portal_visible !== 'boolean') return Response.json({ error: 'portal_visible required' }, { status: 400 });

  const { data: profile } = await admin.from('profiles').select('display_name').eq('id', user.id).single();

  const { data: updated, error } = await admin
    .from('media_items').update({ portal_visible }).eq('id', mediaItemId).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  logAudit({
    entityId:   doc.collective_id || user.id,
    userId:     user.id,
    userName:   profile?.display_name || user.email,
    action:     portal_visible ? 'Média megjelent a portálon' : 'Média eltávolítva a portálról',
    targetType: 'media_item',
    targetId:   mediaItemId,
    details:    { portal_visible, document_type: item.document_type, document_id: item.document_id },
  });

  return Response.json({ mediaItem: updated });
}

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
  logAudit({ entityId: doc.collective_id || user.id, userId: user.id, action: 'Media item deleted', targetType: 'media_item', targetId: mediaItemId, details: { document_type: item.document_type, document_id: item.document_id } });
  return Response.json({ ok: true });
}

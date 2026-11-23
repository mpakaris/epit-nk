// DELETE /api/quotes/[id]/media/[mediaId]

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteFromR2 } from '@/lib/r2';
import { logAudit } from '@/lib/audit';

export async function DELETE(request, { params }) {
  const { id: quoteId, mediaId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('display_name').eq('id', user.id).single();

  const { data: quote } = await admin
    .from('quotes').select('id, owner_id, created_by, collective_id').eq('id', quoteId).is('deleted_at', null).single();
  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 });

  const isOwner = quote.owner_id === user.id || quote.created_by === user.id;
  if (!isOwner) {
    if (!quote.collective_id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { data: mem } = await admin.from('collective_members')
      .select('role').eq('collective_id', quote.collective_id)
      .eq('user_id', user.id).eq('status', 'active').maybeSingle();
    if (!mem || (mem.role !== 'owner' && mem.role !== 'admin'))
      return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: item } = await admin
    .from('media_items').select('id, r2_key, document_id').eq('id', mediaId).single();
  if (!item || item.document_id !== quoteId)
    return Response.json({ error: 'Not found' }, { status: 404 });

  // Only delete from R2 if no other document references this key
  const { count } = await admin
    .from('media_items').select('id', { count: 'exact', head: true }).eq('r2_key', item.r2_key);
  const { count: surveyCount } = await admin
    .from('survey_media').select('id', { count: 'exact', head: true }).eq('drive_file_id', item.r2_key);

  if ((count ?? 0) <= 1 && (surveyCount ?? 0) === 0) {
    await deleteFromR2(item.r2_key).catch(() => {});
  }

  const { error } = await admin.from('media_items').delete().eq('id', mediaId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  logAudit({ entityId: quote.collective_id || user.id, userId: user.id, userName: profile?.display_name || user.email, action: 'Quote media deleted', targetType: 'media_item', targetId: mediaId, details: { quote_id: quoteId, r2_key: item.r2_key } });
  return Response.json({ deleted: true });
}

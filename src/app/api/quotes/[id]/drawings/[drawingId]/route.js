// PATCH /api/quotes/[id]/drawings/[drawingId] — update svg_data
// DELETE /api/quotes/[id]/drawings/[drawingId]

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function getCallerAndQuote(quoteId, user, admin) {
  const { data: quote } = await admin
    .from('quotes').select('id, owner_id, created_by, collective_id').eq('id', quoteId).is('deleted_at', null).single();
  if (!quote) return { err: 'Not found', status: 404 };

  const isOwner = quote.owner_id === user.id || quote.created_by === user.id;
  if (!isOwner) {
    if (!quote.collective_id) return { err: 'Forbidden', status: 403 };
    const { data: mem } = await admin.from('collective_members')
      .select('role').eq('collective_id', quote.collective_id)
      .eq('user_id', user.id).eq('status', 'active').maybeSingle();
    if (!mem || (mem.role !== 'owner' && mem.role !== 'admin'))
      return { err: 'Forbidden', status: 403 };
  }
  return { quote };
}

export async function PATCH(request, { params }) {
  const { id: quoteId, drawingId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('display_name').eq('id', user.id).single();

  const ctx = await getCallerAndQuote(quoteId, user, admin);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { svg_data } = await request.json();
  if (!svg_data?.trim()) return Response.json({ error: 'svg_data kötelező' }, { status: 400 });

  const { data, error } = await admin
    .from('quote_drawings').update({ svg_data }).eq('id', drawingId).eq('quote_id', quoteId).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  logAudit({ entityId: ctx.quote.collective_id || user.id, userId: user.id, userName: profile?.display_name || user.email, action: 'Quote drawing updated', targetType: 'quote_drawing', targetId: drawingId });
  return Response.json({ drawing: data });
}

export async function DELETE(request, { params }) {
  const { id: quoteId, drawingId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('display_name').eq('id', user.id).single();

  const ctx = await getCallerAndQuote(quoteId, user, admin);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { error } = await admin.from('quote_drawings').delete().eq('id', drawingId).eq('quote_id', quoteId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  logAudit({ entityId: ctx.quote.collective_id || user.id, userId: user.id, userName: profile?.display_name || user.email, action: 'Quote drawing deleted', targetType: 'quote_drawing', targetId: drawingId });
  return Response.json({ deleted: true });
}

// POST /api/quotes/[id]/drawings — create a quote drawing
// Body: { svg_data, section_id? }

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

export async function POST(request, { params }) {
  const { id: quoteId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('display_name').eq('id', user.id).single();

  const ctx = await getCallerAndQuote(quoteId, user, admin);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { svg_data, section_id } = await request.json();
  if (!svg_data?.trim()) return Response.json({ error: 'svg_data kötelező' }, { status: 400 });

  const { data, error } = await admin
    .from('quote_drawings')
    .insert({ quote_id: quoteId, section_id: section_id || null, svg_data, created_by: user.id })
    .select().single();

  if (error) {
    logAudit({ entityId: ctx.quote.collective_id || user.id, userId: user.id, userName: profile?.display_name || user.email, action: 'Quote drawing creation failed', targetType: 'quote_drawing', details: { error: error.message, quote_id: quoteId } });
    return Response.json({ error: error.message }, { status: 400 });
  }

  logAudit({ entityId: ctx.quote.collective_id || user.id, userId: user.id, userName: profile?.display_name || user.email, action: 'Quote drawing created', targetType: 'quote_drawing', targetId: data.id, details: { quote_id: quoteId, section_id: section_id || null } });
  return Response.json({ drawing: data });
}

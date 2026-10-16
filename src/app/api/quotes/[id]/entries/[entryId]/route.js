import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getCtx(quoteId, entryId) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  const { data: entry } = await admin.from('quote_entries').select('*').eq('id', entryId).single();
  if (!entry) return { err: 'Not found', status: 404 };

  const isSuperAdmin = profile?.role === 'superadmin';
  const isOwn = entry.user_id === user.id;

  if (isSuperAdmin || isOwn) return { user, admin, entry, isSuperAdmin };

  // Collective members with edit access can also modify
  const { data: quote } = await admin.from('quotes').select('collective_id, owner_id, created_by').eq('id', quoteId).single();
  const isQuoteOwner = quote?.owner_id === user.id || quote?.created_by === user.id;
  if (isQuoteOwner) return { user, admin, entry, isSuperAdmin };

  return { err: 'Forbidden', status: 403 };
}

export async function PATCH(request, { params }) {
  const { id: quoteId, entryId } = await params;
  const ctx = await getCtx(quoteId, entryId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const fields = await request.json();
  const allowed = ['work_description', 'quantity', 'unit', 'unit_price', 'amount_huf', 'notes', 'entry_type', 'section_id'];
  const update = {};
  for (const k of allowed) if (k in fields) update[k] = fields[k];

  const { data, error } = await ctx.admin.from('quote_entries').update(update).eq('id', entryId).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ entry: data });
}

export async function DELETE(request, { params }) {
  const { id: quoteId, entryId } = await params;
  const ctx = await getCtx(quoteId, entryId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { error } = await ctx.admin.from('quote_entries').delete().eq('id', entryId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}

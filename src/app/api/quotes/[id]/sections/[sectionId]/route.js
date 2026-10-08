import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getCtx(quoteId) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, entity_id').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };
  const { data: quote } = await admin.from('quotes').select('id, entity_id').eq('id', quoteId).single();
  if (!quote) return { err: 'Quote not found', status: 404 };
  if (profile.role !== 'superadmin' && quote.entity_id !== profile.entity_id) return { err: 'Forbidden', status: 403 };
  return { profile, admin, quote };
}

export async function PATCH(request, { params }) {
  const { id: quoteId, sectionId } = await params;
  const ctx = await getCtx(quoteId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const body = await request.json();
  const allowed = ['name', 'description', 'size_m2', 'sort_order', 'start_date', 'end_date'];
  const update = {};
  for (const k of allowed) if (k in body) update[k] = body[k];
  if ('name' in update) { update.name = update.name?.trim(); if (!update.name) return Response.json({ error: 'Név kötelező' }, { status: 400 }); }
  if ('size_m2' in update) update.size_m2 = update.size_m2 != null && update.size_m2 !== '' ? Number(update.size_m2) : null;

  const { data, error } = await ctx.admin.from('quote_sections').update(update).eq('id', sectionId).eq('quote_id', quoteId).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ section: data });
}

export async function DELETE(request, { params }) {
  const { id: quoteId, sectionId } = await params;
  const ctx = await getCtx(quoteId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  // Ungrouped entries linked to this section (set their section_id to null)
  await ctx.admin.from('quote_entries').update({ section_id: null }).eq('section_id', sectionId);
  const { error } = await ctx.admin.from('quote_sections').delete().eq('id', sectionId).eq('quote_id', quoteId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}

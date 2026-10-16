import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getCtx(quoteId) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };
  const { data: quote } = await admin.from('quotes').select('id, owner_id, created_by, collective_id, shared_with').eq('id', quoteId).single();
  if (!quote) return { err: 'Quote not found', status: 404 };
  const isSuperAdmin = profile.role === 'superadmin';
  const isOwner = quote.owner_id === user.id || quote.created_by === user.id;
  const isShared = (quote.shared_with || []).includes(user.id);
  if (!isSuperAdmin && !isOwner && !isShared) return { err: 'Forbidden', status: 403 };
  return { profile, admin, quote };
}

export async function PATCH(request, { params }) {
  const { id: quoteId, sectionId } = await params;
  const ctx = await getCtx(quoteId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const body = await request.json();
  const allowed = ['name', 'description', 'width_m', 'length_m', 'height_m', 'window_count', 'door_count', 'sort_order', 'start_date', 'end_date', 'survey_entry_id'];
  const update = {};
  for (const k of allowed) if (k in body) update[k] = body[k];
  if ('name' in update) { update.name = update.name?.trim(); if (!update.name) return Response.json({ error: 'Név kötelező' }, { status: 400 }); }
  for (const numField of ['width_m', 'length_m', 'height_m']) {
    if (numField in update) update[numField] = update[numField] != null && update[numField] !== '' ? Number(update[numField]) : null;
  }
  for (const intField of ['window_count', 'door_count']) {
    if (intField in update) update[intField] = update[intField] != null ? Number(update[intField]) : 0;
  }
  // Recompute size_m2 from stored dimensions
  if ('width_m' in update || 'length_m' in update) {
    const w = update.width_m  ?? null;
    const l = update.length_m ?? null;
    update.size_m2 = w > 0 && l > 0 ? w * l : null;
  }

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

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getCtx(quoteId, sectionId) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };

  const { data: quote } = await admin
    .from('quotes')
    .select('id, owner_id, created_by, collective_id, shared_with')
    .eq('id', quoteId)
    .single();
  if (!quote) return { err: 'Quote not found', status: 404 };

  const { data: section } = await admin
    .from('quote_sections')
    .select('id, created_by')
    .eq('id', sectionId)
    .eq('quote_id', quoteId)
    .single();
  if (!section) return { err: 'Section not found', status: 404 };

  const isSuperAdmin  = profile.role === 'superadmin';
  const isQuoteOwner  = quote.owner_id === user.id || quote.created_by === user.id;
  const isShared      = (quote.shared_with || []).includes(user.id);
  const isSectionOwner = section.created_by === user.id;

  let isCollectiveMember = false;
  if (!isSuperAdmin && !isQuoteOwner && !isShared && quote.collective_id) {
    const { data: mem } = await admin
      .from('collective_members')
      .select('user_id')
      .eq('collective_id', quote.collective_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    isCollectiveMember = !!mem;
  }

  if (!isSuperAdmin && !isQuoteOwner && !isShared && !isCollectiveMember)
    return { err: 'Forbidden', status: 403 };

  return { user, profile, admin, quote, section, isSuperAdmin, isQuoteOwner, isSectionOwner };
}

export async function PATCH(request, { params }) {
  const { id: quoteId, sectionId } = await params;
  const ctx = await getCtx(quoteId, sectionId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  // Members can only edit their own sections; owner/superadmin can edit all
  if (!ctx.isSuperAdmin && !ctx.isQuoteOwner && !ctx.isSectionOwner)
    return Response.json({ error: 'Csak a saját szekciót szerkesztheted.' }, { status: 403 });

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
  const ctx = await getCtx(quoteId, sectionId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  // Members can only delete their own sections; owner/superadmin can delete all
  if (!ctx.isSuperAdmin && !ctx.isQuoteOwner && !ctx.isSectionOwner)
    return Response.json({ error: 'Csak a saját szekciót törölheted.' }, { status: 403 });

  await ctx.admin.from('quote_entries').update({ section_id: null }).eq('section_id', sectionId);
  const { error } = await ctx.admin.from('quote_sections').delete().eq('id', sectionId).eq('quote_id', quoteId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}

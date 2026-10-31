import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function getCtx(quoteId) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, display_name').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };
  const { data: quote } = await admin.from('quotes').select('id, owner_id, created_by, collective_id, survey_id').eq('id', quoteId).single();
  if (!quote) return { err: 'Quote not found', status: 404 };

  const isSuperAdmin = profile.role === 'superadmin';
  const isOwner = quote.owner_id === user.id || quote.created_by === user.id;
  const isShared = (quote.shared_with || []).includes(user.id);

  let isCollectiveMember = false;
  if (!isSuperAdmin && !isOwner && !isShared && quote.collective_id) {
    const { data: mem } = await admin.from('collective_members')
      .select('user_id').eq('collective_id', quote.collective_id).eq('user_id', user.id).eq('status', 'active').maybeSingle();
    isCollectiveMember = !!mem;
  }

  if (!isSuperAdmin && !isOwner && !isShared && !isCollectiveMember) return { err: 'Forbidden', status: 403 };
  return { user, profile, admin, quote, isOwner, isSuperAdmin };
}

export async function POST(request, { params }) {
  const { id: quoteId } = await params;
  const ctx = await getCtx(quoteId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { name, description, width_m, length_m, height_m, window_count, door_count, sort_order, survey_entry_id, start_date, end_date } = await request.json();
  if (!name?.trim()) return Response.json({ error: 'Szekció neve kötelező' }, { status: 400 });

  const wNum = width_m  != null && width_m  !== '' ? Number(width_m)  : null;
  const lNum = length_m != null && length_m !== '' ? Number(length_m) : null;

  const { data: section, error } = await ctx.admin.from('quote_sections').insert([{
    quote_id:        quoteId,
    name:            name.trim(),
    description:     description?.trim() || null,
    width_m:         wNum,
    length_m:        lNum,
    size_m2:         wNum > 0 && lNum > 0 ? wNum * lNum : null,
    height_m:        height_m     != null && height_m     !== '' ? Number(height_m)     : null,
    window_count:    window_count != null                        ? Number(window_count) : 0,
    door_count:      door_count   != null                        ? Number(door_count)   : 0,
    sort_order:      sort_order ?? 0,
    survey_entry_id: survey_entry_id || null,
    start_date:      start_date || null,
    end_date:        end_date   || null,
    created_by:      ctx.user.id,
    created_by_name: ctx.profile.display_name || null,
  }]).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  logAudit({
    entityId: ctx.quote.collective_id || ctx.user.id, userId: ctx.user.id,
    userName: ctx.profile.display_name || ctx.user.email,
    action: 'Szekció hozzáadva', targetType: 'quote', targetId: quoteId,
    details: { name: section.name },
  });

  return Response.json({ section }, { status: 201 });
}

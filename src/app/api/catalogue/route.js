import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getCtx() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles')
    .select('id, role, active_collective_id').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };
  return { user, profile, admin };
}

export async function GET() {
  const ctx = await getCtx();
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const collectiveId = ctx.profile.active_collective_id;
  let query = ctx.admin.from('catalogue_items').select('*').eq('is_active', true);

  if (collectiveId) {
    query = query.or(`owner_id.eq.${ctx.user.id},collective_id.eq.${collectiveId}`);
  } else {
    query = query.eq('owner_id', ctx.user.id).is('collective_id', null);
  }

  const { data: items, error } = await query.order('trade').order('sort_order').order('name');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ items });
}

export async function POST(request) {
  const ctx = await getCtx();
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const body = await request.json();
  const { trade, name, unit, labour_price, materials, notes, sort_order = 0 } = body;

  if (!name?.trim())  return Response.json({ error: 'A tétel neve kötelező' }, { status: 400 });
  if (!unit?.trim())  return Response.json({ error: 'A mértékegység kötelező' }, { status: 400 });

  const collectiveId = ctx.profile.active_collective_id;

  const { data: item, error } = await ctx.admin.from('catalogue_items').insert([{
    owner_id:      ctx.user.id,
    collective_id: collectiveId || null,
    trade:         trade?.trim() || null,
    name:          name.trim(),
    unit:          unit.trim(),
    labour_price:  labour_price != null ? Number(labour_price) : null,
    materials:     materials || null,
    notes:         notes?.trim() || null,
    sort_order,
  }]).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ item }, { status: 201 });
}

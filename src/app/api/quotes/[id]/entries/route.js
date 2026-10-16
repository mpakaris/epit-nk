import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request, { params }) {
  const { id: quoteId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: quote } = await admin.from('quotes').select('id, owner_id, created_by, collective_id').eq('id', quoteId).single();
  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 });

  const isOwner = quote.owner_id === user.id || quote.created_by === user.id;
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  const isSuperAdmin = profile?.role === 'superadmin';

  if (!isOwner && !isSuperAdmin) {
    if (!quote.collective_id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { data: mem } = await admin.from('collective_members').select('role').eq('collective_id', quote.collective_id).eq('user_id', user.id).eq('status', 'active').maybeSingle();
    if (!mem) return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { data, error } = await admin.from('quote_entries').insert([{
    quote_id:         quoteId,
    user_id:          body.user_id          || user.id,
    entry_type:       body.entry_type       || 'other',
    work_description: body.work_description,
    quantity:         body.quantity         != null ? Number(body.quantity)   : null,
    unit:             body.unit             || null,
    unit_price:       body.unit_price       != null ? Number(body.unit_price) : null,
    amount_huf:       Number(body.amount_huf),
    notes:            body.notes            || '',
    section_id:       body.section_id       || null,
    created_by_name:  body.created_by_name  || null,
  }]).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ entry: data }, { status: 201 });
}

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getProfileAndItem(userId, itemId) {
  const admin = createAdminClient();
  const [{ data: profile }, { data: item }] = await Promise.all([
    admin.from('profiles').select('role, entity_id').eq('id', userId).single(),
    admin.from('payment_plan_items').select('*').eq('id', itemId).single(),
  ]);
  return { admin, profile, item };
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { admin, profile, item } = await getProfileAndItem(user.id, id);
  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    return Response.json({ error: 'Nincs jogosultság' }, { status: 403 });
  }
  if (!item) return Response.json({ error: 'Nem található' }, { status: 404 });

  const body = await request.json();
  const allowed = ['label', 'trigger_type', 'milestone_name', 'amount_huf', 'due_date', 'note', 'status', 'paid_at', 'sort_order'];
  const updates = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  // coerce amount
  if ('amount_huf' in updates) updates.amount_huf = Math.round(Number(updates.amount_huf));

  // auto-set paid_at when marking paid
  if (updates.status === 'paid' && !updates.paid_at) {
    updates.paid_at = new Date().toISOString();
  }
  // clear paid_at when un-marking
  if (updates.status === 'pending') {
    updates.paid_at = null;
  }

  // clear milestone_name if trigger type changes away from milestone
  if ('trigger_type' in updates && updates.trigger_type !== 'milestone') {
    updates.milestone_name = null;
  }

  const { data: updated, error } = await admin
    .from('payment_plan_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ item: updated });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { admin, profile, item } = await getProfileAndItem(user.id, id);
  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    return Response.json({ error: 'Nincs jogosultság' }, { status: 403 });
  }
  if (!item) return Response.json({ error: 'Nem található' }, { status: 404 });

  const { error } = await admin.from('payment_plan_items').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}

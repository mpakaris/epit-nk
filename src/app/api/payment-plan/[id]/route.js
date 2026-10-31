import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function resolveItem(userId, itemId) {
  const admin = createAdminClient();
  const [{ data: profile }, { data: item }] = await Promise.all([
    admin.from('profiles').select('role, display_name').eq('id', userId).single(),
    admin.from('payment_plan_items').select('*').eq('id', itemId).single(),
  ]);
  if (!profile || !item) return { admin, profile, item, allowed: false };

  const isSuperAdmin = profile.role === 'superadmin';
  if (isSuperAdmin) return { admin, profile, item, allowed: true };

  const { data: project } = await admin.from('projects').select('owner_id, created_by, collective_id').eq('id', item.project_id).single();
  if (!project) return { admin, profile, item, allowed: false };

  const isOwner = project.owner_id === userId || project.created_by === userId;
  if (isOwner) return { admin, profile, item, allowed: true };

  if (project.collective_id) {
    const { data: mem } = await admin.from('collective_members').select('role').eq('collective_id', project.collective_id).eq('user_id', userId).eq('status', 'active').maybeSingle();
    if (mem && (mem.role === 'owner' || mem.role === 'admin')) return { admin, profile, item, allowed: true };
  }

  return { admin, profile, item, allowed: false };
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { admin, item, allowed } = await resolveItem(user.id, id);
  if (!allowed) return Response.json({ error: 'Csak a projekt tulajdonosa módosíthatja a fizetési tervet.' }, { status: 403 });
  if (!item) return Response.json({ error: 'Nem található' }, { status: 404 });

  const body = await request.json();
  const allowed_fields = ['label', 'trigger_type', 'milestone_name', 'amount_huf', 'due_date', 'note', 'status', 'paid_at', 'sort_order'];
  const updates = {};
  for (const key of allowed_fields) {
    if (key in body) updates[key] = body[key];
  }

  if ('amount_huf' in updates) updates.amount_huf = Math.round(Number(updates.amount_huf));
  if (updates.status === 'paid' && !updates.paid_at) updates.paid_at = new Date().toISOString();
  if (updates.status === 'pending') updates.paid_at = null;
  if ('trigger_type' in updates && updates.trigger_type !== 'milestone') updates.milestone_name = null;

  const { data: updated, error } = await admin.from('payment_plan_items').update(updates).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ item: updated });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { admin, item, allowed } = await resolveItem(user.id, id);
  if (!allowed) return Response.json({ error: 'Csak a projekt tulajdonosa törölhet fizetési tételt.' }, { status: 403 });
  if (!item) return Response.json({ error: 'Nem található' }, { status: 404 });

  const { error } = await admin.from('payment_plan_items').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}

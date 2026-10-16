import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function getCallerAndClient(id) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, display_name').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };

  const { data: client } = await admin.from('clients').select('owner_id, name').eq('id', id).single();
  if (!client) return { err: 'Not found', status: 404 };

  const isSuperAdmin = profile.role === 'superadmin';
  const isOwner      = client.owner_id === user.id;
  if (!isSuperAdmin && !isOwner) return { err: 'Forbidden', status: 403 };

  return { user, profile, admin, client };
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndClient(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const fields = await request.json();
  const allowed = ['name', 'address', 'phone', 'email', 'notes', 'discount_percent', 'company_name', 'tax_number'];
  const update = {};
  for (const k of allowed) if (k in fields) update[k] = fields[k];

  const { data, error } = await ctx.admin.from('clients').update(update).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  logAudit({
    entityId: ctx.user.id,
    userId:   ctx.user.id,
    userName: ctx.profile.display_name || ctx.user.email,
    action:   'Ügyfél módosítva',
    targetType: 'client',
    targetId:   id,
    targetName: data.name,
  });

  return Response.json({ client: data });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndClient(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { error } = await ctx.admin.from('clients').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  logAudit({
    entityId: ctx.user.id,
    userId:   ctx.user.id,
    userName: ctx.profile.display_name || ctx.user.email,
    action:   'Ügyfél törölve',
    targetType: 'client',
    targetId:   id,
    targetName: ctx.client.name,
  });

  return Response.json({ success: true });
}

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

  const body = await request.json();
  const { collectiveShares, sharesGdprConfirmed, ...rest } = body;

  const allowed = ['name', 'address', 'phone', 'email', 'notes', 'discount_percent', 'company_name', 'tax_number'];
  const update = {};
  for (const k of allowed) if (k in rest) update[k] = rest[k];

  if (Object.keys(update).length > 0) {
    const { error } = await ctx.admin.from('clients').update(update).eq('id', id);
    if (error) return Response.json({ error: error.message }, { status: 400 });
  }

  if (Array.isArray(collectiveShares)) {
    if (collectiveShares.length > 0 && !sharesGdprConfirmed) {
      return Response.json({ error: 'Kollektíva megosztáshoz GDPR megerősítés szükséges!' }, { status: 400 });
    }
    await ctx.admin.from('client_collective_shares').delete().eq('client_id', id);
    if (collectiveShares.length > 0) {
      await ctx.admin.from('client_collective_shares').insert(
        collectiveShares.map(cid => ({
          client_id:         id,
          collective_id:     cid,
          shared_by:         ctx.user.id,
          gdpr_confirmed_at: new Date().toISOString(),
        }))
      );
    }
  }

  const { data: clientWithShares, error: fetchErr } = await ctx.admin
    .from('clients')
    .select('*, client_collective_shares(collective_id)')
    .eq('id', id)
    .single();
  if (fetchErr) return Response.json({ error: fetchErr.message }, { status: 400 });

  logAudit({
    entityId: ctx.user.id,
    userId:   ctx.user.id,
    userName: ctx.profile.display_name || ctx.user.email,
    action:   'Ügyfél módosítva',
    targetType: 'client',
    targetId:   id,
    targetName: clientWithShares.name,
  });

  return Response.json({ client: clientWithShares });
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

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

// PATCH — rename collective (owner only)
// DELETE — delete collective (owner only)

async function getCallerRole(admin, collectiveId, userId) {
  const { data } = await admin
    .from('collective_members')
    .select('role')
    .eq('collective_id', collectiveId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  return data?.role || null;
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const role = await getCallerRole(admin, id, user.id);
  if (role !== 'owner') return Response.json({ error: 'Csak a tulajdonos módosíthatja a kollektívát' }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim()) return Response.json({ error: 'A név nem lehet üres' }, { status: 400 });

  const { data, error } = await admin.from('collectives').update({ name: name.trim() }).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data: callerProfile } = await admin.from('profiles').select('display_name').eq('id', user.id).single();
  logAudit({
    entityId:   id,
    userId:     user.id,
    userName:   callerProfile?.display_name || user.email,
    action:     'Kollektíva módosítva',
    targetType: 'collective',
    targetId:   id,
    targetName: data.name,
  });

  return Response.json({ collective: data });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const role = await getCallerRole(admin, id, user.id);
  if (role !== 'owner') return Response.json({ error: 'Csak a tulajdonos törölheti a kollektívát' }, { status: 403 });

  const [{ data: collectiveData }, { data: callerProfile }] = await Promise.all([
    admin.from('collectives').select('name').eq('id', id).single(),
    admin.from('profiles').select('display_name').eq('id', user.id).single(),
  ]);

  const { error } = await admin.from('collectives').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  logAudit({
    entityId:   id,
    userId:     user.id,
    userName:   callerProfile?.display_name || user.email,
    action:     'Kollektíva törölve',
    targetType: 'collective',
    targetId:   id,
    targetName: collectiveData?.name,
  });

  return Response.json({ ok: true });
}

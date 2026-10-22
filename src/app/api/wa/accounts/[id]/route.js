import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireOwnerOrAdmin(user, admin) {
  const { data: profile } = await admin
    .from('profiles')
    .select('active_collective_id')
    .eq('id', user.id)
    .single();
  if (!profile?.active_collective_id) return { error: 'Nincs aktív kollektíva', status: 403 };

  const { data: member } = await admin
    .from('collective_members')
    .select('role')
    .eq('collective_id', profile.active_collective_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { error: 'Nincs jogosultságod', status: 403 };
  }
  return { collectiveId: profile.active_collective_id };
}

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const ctx   = await requireOwnerOrAdmin(user, admin);
  if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status });

  const { data: account } = await admin
    .from('wa_accounts')
    .select('*, assignments:subbie_project_assignments(project_id, is_active, project:projects(id, name))')
    .eq('id', id)
    .eq('collective_id', ctx.collectiveId)
    .single();

  if (!account) return Response.json({ error: 'Nem található' }, { status: 404 });
  return Response.json({ account });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const ctx   = await requireOwnerOrAdmin(user, admin);
  if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status });

  const body = await request.json();
  const allowed = ['display_name', 'is_active', 'permissions'];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  if (!Object.keys(updates).length) {
    return Response.json({ error: 'Nincs módosítható mező' }, { status: 400 });
  }

  const { error } = await admin
    .from('wa_accounts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('collective_id', ctx.collectiveId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ updated: true });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const ctx   = await requireOwnerOrAdmin(user, admin);
  if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status });

  await admin.from('wa_accounts')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('collective_id', ctx.collectiveId);

  return Response.json({ deactivated: true });
}

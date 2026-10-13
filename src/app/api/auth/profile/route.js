import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    return Response.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const { data: membershipsRaw } = await admin
    .from('memberships')
    .select('id, entity_id, role, status, entities(id, name, type)')
    .eq('user_id', user.id)
    .eq('status', 'active');

  const memberships = (membershipsRaw || []).map(m => ({
    id: m.id,
    entity_id: m.entity_id,
    role: m.role,
    entity_name: m.entities?.name || null,
    entity_type: m.entities?.type || 'collective',
  }));

  return Response.json({ profile, memberships });
}

export async function PATCH(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await request.json();

  // Only allow a user to clear their own must_change_password flag
  if (Object.keys(body).length !== 1 || body.must_change_password !== false)
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}

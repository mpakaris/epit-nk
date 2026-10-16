import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Return collective memberships for the context switcher
  const { data: membershipsRaw } = await admin
    .from('collective_members')
    .select('collective_id, role, status, collectives(id, name)')
    .eq('user_id', user.id)
    .eq('status', 'active');

  const collectives = (membershipsRaw || []).map(m => ({
    collective_id: m.collective_id,
    role:          m.role,
    name:          m.collectives?.name || null,
  }));

  return Response.json({ profile, collectives });
}

export async function PATCH(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  // Password-reset acknowledgement (internal flag)
  if (Object.keys(body).length === 1 && body.must_change_password === false) {
    const { error } = await admin.from('profiles').update({ must_change_password: false }).eq('id', user.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  }

  // Letterhead / profile info update
  const allowed = ['display_name', 'first_name', 'last_name', 'company_name', 'street', 'street_number', 'zip', 'city', 'tax_number', 'default_tax_percent'];
  const update = {};
  for (const k of allowed) if (k in body) update[k] = body[k] ?? null;
  if (Object.keys(update).length === 0)
    return Response.json({ error: 'No updatable fields' }, { status: 400 });

  const { data, error } = await admin.from('profiles').update(update).eq('id', user.id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ profile: data });
}

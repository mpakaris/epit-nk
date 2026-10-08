import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getCallerProfile(supabase, admin) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Unauthenticated', status: 401 };
  const { data: profile } = await admin.from('profiles').select('id, role, entity_id, display_name').eq('id', user.id).single();
  if (!profile) return { error: 'Profile not found', status: 403 };
  if (profile.role !== 'superadmin' && !profile.entity_id) return { error: 'No entity assigned', status: 400 };
  return { user, profile };
}

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const ctx = await getCallerProfile(supabase, admin);
  if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status });

  let entityId = ctx.profile.entity_id;
  if (ctx.profile.role === 'superadmin') {
    const { searchParams } = new URL(request.url);
    entityId = searchParams.get('entity_id');
    if (!entityId) return Response.json({ error: 'entity_id required for superadmin' }, { status: 400 });
  }

  const { data: surveys, error } = await admin
    .from('surveys')
    .select('*')
    .eq('entity_id', entityId)
    .order('date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ surveys: surveys || [] });
}

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const ctx = await getCallerProfile(supabase, admin);
  if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status });

  if (!['admin', 'superadmin'].includes(ctx.profile.role)) {
    return Response.json({ error: 'Csak adminisztrátor hozhat létre felmérést!' }, { status: 403 });
  }

  const body = await request.json();
  const { title, notes, date, location, client_id, entity_id: bodyEntityId } = body;

  if (!title?.trim()) return Response.json({ error: 'A cím kötelező' }, { status: 400 });

  let entityId = ctx.profile.entity_id;
  if (ctx.profile.role === 'superadmin' && bodyEntityId) entityId = bodyEntityId;
  if (!entityId) return Response.json({ error: 'Nincs entitás' }, { status: 400 });

  const { data: survey, error: insertErr } = await admin.from('surveys').insert([{
    entity_id: entityId,
    client_id: client_id || null,
    title: title.trim(),
    notes: notes?.trim() || null,
    date: date || null,
    location: location?.trim() || null,
    created_by: ctx.profile.id,
  }]).select().single();

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });
  return Response.json({ survey }, { status: 201 });
}

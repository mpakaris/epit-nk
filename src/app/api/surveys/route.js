import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getCallerProfile(supabase, admin) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Unauthenticated', status: 401 };
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, active_collective_id, display_name')
    .eq('id', user.id)
    .single();
  if (!profile) return { error: 'Profile not found', status: 403 };
  return { user, profile };
}

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const ctx = await getCallerProfile(supabase, admin);
  if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status });

  const { profile, user } = ctx;
  let query = admin.from('surveys').select('*')
    .order('date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (profile.role === 'superadmin') {
    const { searchParams } = new URL(request.url);
    const collectiveId = searchParams.get('collective_id');
    if (collectiveId) query = query.eq('collective_id', collectiveId);
  } else if (profile.active_collective_id) {
    query = query.or(`collective_id.eq.${profile.active_collective_id},and(owner_id.eq.${user.id},collective_id.is.null)`);
  } else {
    query = query.eq('owner_id', user.id).is('collective_id', null);
  }

  const { data: surveys, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ surveys: surveys || [] });
}

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const ctx = await getCallerProfile(supabase, admin);
  if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status });

  const { title, notes, date, location, client_id, collective_id: bodyCollectiveId, shared_with = [] } = await request.json();
  if (!title?.trim()) return Response.json({ error: 'A cím kötelező' }, { status: 400 });

  const { profile, user } = ctx;
  const collectiveId = profile.role === 'superadmin'
    ? (bodyCollectiveId || null)
    : (profile.active_collective_id || null);

  if (collectiveId && profile.role !== 'superadmin') {
    const { data: mem } = await admin
      .from('collective_members')
      .select('collective_id')
      .eq('user_id', user.id)
      .eq('collective_id', collectiveId)
      .eq('status', 'active')
      .maybeSingle();
    if (!mem) return Response.json({ error: 'Nincs hozzáférés ehhez a csoporthoz' }, { status: 403 });
  }

  const { data: survey, error: insertErr } = await admin.from('surveys').insert([{
    owner_id:      user.id,
    collective_id: collectiveId,
    client_id:     client_id || null,
    title:         title.trim(),
    notes:         notes?.trim() || null,
    date:          date || null,
    location:      location?.trim() || null,
    created_by:    user.id,
  }]).select().single();

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

  if (Array.isArray(shared_with) && shared_with.length > 0) {
    await admin.from('surveys').update({ shared_with }).eq('id', survey.id).catch(() => {});
  }

  return Response.json({ survey: { ...survey, shared_with: shared_with || [] } }, { status: 201 });
}

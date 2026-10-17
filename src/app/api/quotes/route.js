import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, display_name, active_collective_id').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const {
    title, location, work_type, description,
    start_date, end_date, status = 'draft',
    client_id, created_by, shared_with = [], tax_percent = 0,
    survey_id,
    // collective_id from body only honoured for superadmin — others use DB profile
    collective_id: bodyCollectiveId,
  } = body;

  if (!title?.trim()) return Response.json({ error: 'Az ajánlat neve kötelező' }, { status: 400 });

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

  const { data, error } = await admin.from('quotes').insert([{
    owner_id:      user.id,
    collective_id: collectiveId,
    title:         title.trim(),
    location:      location      || null,
    work_type:     work_type     || null,
    description:   description   || null,
    start_date:    start_date    || null,
    end_date:      end_date      || null,
    status,
    client_id:     client_id     || null,
    created_by:    created_by    || user.id,
    shared_with:   shared_with,
    tax_percent:   Number(tax_percent) || 0,
    survey_id:     survey_id     || null,
  }]).select().single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ quote: data }, { status: 201 });
}

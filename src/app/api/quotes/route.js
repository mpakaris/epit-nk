import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, display_name').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const {
    title, location, work_type, description,
    start_date, end_date, status = 'draft',
    client_id, created_by, shared_with = [], tax_percent = 0,
    survey_id, owner_id, collective_id,
  } = body;

  if (!title?.trim()) return Response.json({ error: 'Az ajánlat neve kötelező' }, { status: 400 });

  const { data, error } = await admin.from('quotes').insert([{
    owner_id:      owner_id      || user.id,
    collective_id: collective_id || null,
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

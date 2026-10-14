import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');
  if (!projectId) return Response.json({ error: 'project_id required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: items, error } = await admin
    .from('payment_plan_items')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')
    .order('created_at');

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ items: items || [] });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, entity_id')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    return Response.json({ error: 'Csak adminisztrátor hozhat létre fizetési tételt.' }, { status: 403 });
  }

  const body = await request.json();
  const { project_id, label, trigger_type, milestone_name, amount_huf, due_date, note } = body;

  if (!project_id) return Response.json({ error: 'project_id kötelező' }, { status: 400 });
  if (!label?.trim()) return Response.json({ error: 'A cím megadása kötelező' }, { status: 400 });
  if (!amount_huf || Number(amount_huf) <= 0) return Response.json({ error: 'Az összeg kötelező' }, { status: 400 });

  const { data: project } = await admin
    .from('projects')
    .select('entity_id')
    .eq('id', project_id)
    .single();

  if (!project) return Response.json({ error: 'Projekt nem található' }, { status: 404 });

  // next sort_order
  const { data: existing } = await admin
    .from('payment_plan_items')
    .select('sort_order')
    .eq('project_id', project_id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = ((existing?.[0]?.sort_order ?? -1) + 1);

  const { data: item, error } = await admin
    .from('payment_plan_items')
    .insert([{
      project_id,
      entity_id: project.entity_id,
      sort_order: nextOrder,
      label: label.trim(),
      trigger_type: trigger_type || 'milestone',
      milestone_name: trigger_type === 'milestone' ? (milestone_name?.trim() || null) : null,
      amount_huf: Math.round(Number(amount_huf)),
      due_date: due_date || null,
      note: note?.trim() || null,
      created_by: user.id,
    }])
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ item });
}

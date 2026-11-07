import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function resolveAccess(userId) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, display_name').eq('id', userId).single();
  return { admin, profile, isSuperAdmin: profile?.role === 'superadmin' };
}

async function isProjectOwnerOrAdmin(admin, userId, projectId) {
  const { data: project } = await admin.from('projects').select('owner_id, created_by, collective_id').eq('id', projectId).is('deleted_at', null).single();
  if (!project) return { allowed: false, project: null };

  const isSuperAdmin = false; // handled separately
  const isOwner = project.owner_id === userId || project.created_by === userId;
  if (isOwner) return { allowed: true, project };

  if (project.collective_id) {
    const { data: mem } = await admin.from('collective_members').select('role').eq('collective_id', project.collective_id).eq('user_id', userId).eq('status', 'active').maybeSingle();
    if (mem && (mem.role === 'owner' || mem.role === 'admin')) return { allowed: true, project };
  }
  return { allowed: false, project };
}

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

  const { admin, profile, isSuperAdmin } = await resolveAccess(user.id);
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { project_id, label, trigger_type, milestone_name, amount_huf, due_date, note } = body;

  if (!project_id) return Response.json({ error: 'project_id kötelező' }, { status: 400 });
  if (!label?.trim()) return Response.json({ error: 'A cím megadása kötelező' }, { status: 400 });
  if (!amount_huf || Number(amount_huf) <= 0) return Response.json({ error: 'Az összeg kötelező' }, { status: 400 });

  if (!isSuperAdmin) {
    const { allowed } = await isProjectOwnerOrAdmin(admin, user.id, project_id);
    if (!allowed) {
      logAudit({ entityId: user.id, userId: user.id, userName: profile.display_name || '', action: 'Payment plan creation denied', targetType: 'payment_item', details: { error: 'Permission denied', project_id } });
      return Response.json({ error: 'Csak a projekt tulajdonosa adhat hozzá fizetési tételt.' }, { status: 403 });
    }
  }

  const { data: project } = await admin.from('projects').select('collective_id').eq('id', project_id).is('deleted_at', null).single();
  if (!project) return Response.json({ error: 'Projekt nem található' }, { status: 404 });

  const { data: existing } = await admin.from('payment_plan_items').select('sort_order').eq('project_id', project_id).order('sort_order', { ascending: false }).limit(1);
  const nextOrder = ((existing?.[0]?.sort_order ?? -1) + 1);

  const { data: item, error } = await admin.from('payment_plan_items').insert([{
    project_id,
    sort_order:     nextOrder,
    label:          label.trim(),
    trigger_type:   trigger_type || 'milestone',
    milestone_name: trigger_type === 'milestone' ? (milestone_name?.trim() || null) : null,
    amount_huf:     Math.round(Number(amount_huf)),
    due_date:       due_date || null,
    note:           note?.trim() || null,
    created_by:     user.id,
  }]).select().single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  logAudit({ entityId: project?.collective_id || user.id, userId: user.id, userName: profile.display_name || '', action: 'Payment plan item created', targetType: 'payment_item', targetId: item.id, targetName: item.label, details: { project_id, amount_huf: item.amount_huf } });
  return Response.json({ item });
}

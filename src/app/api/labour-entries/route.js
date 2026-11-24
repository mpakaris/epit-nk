import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { checkCollectiveStatus } from '@/lib/collectiveGuard';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, display_name').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();

  // Accept both old field names (desktop LabourEditModal) and new mobile names
  const projectId        = body.projectId     || body.project_id;
  const labourType       = body.labourType     || body.work_type;
  const hours            = body.hours          ?? body.quantity;
  const hourlyRate       = body.hourlyRate      ?? body.unit_price;
  const description      = body.description    ?? body.notes ?? '';
  const date             = body.date;
  const unit             = body.unit;
  const roomId           = body.roomId         || body.room_id || null;
  const endDate          = body.end_date        || null;
  const countsAsExpense  = body.counts_as_expense !== false; // default true

  if (!projectId) return Response.json({ error: 'A projekt megadása kötelező!' }, { status: 400 });
  if (!date)      return Response.json({ error: 'A dátum megadása kötelező!' }, { status: 400 });
  if (!labourType?.trim()) return Response.json({ error: 'A munkavégzés típusa kötelező!' }, { status: 400 });

  // Verify access to the project
  const { data: project } = await admin.from('projects').select('id, owner_id, created_by, collective_id, name, status').eq('id', projectId).is('deleted_at', null).single();
  if (!project) return Response.json({ error: 'Projekt nem található' }, { status: 404 });
  if (project.status === 'closed' || project.status === 'expired') return Response.json({ error: 'Lezárt projekthez nem lehet adatot hozzáadni.' }, { status: 423 });

  const isSuperAdmin = profile.role === 'superadmin';
  const isOwner = project.owner_id === user.id || project.created_by === user.id;
  let isMember = false;
  if (!isSuperAdmin && !isOwner) {
    const { data: membership } = await admin.from('project_members').select('user_id').eq('project_id', projectId).eq('user_id', user.id).maybeSingle();
    isMember = !!membership;

    if (!isMember && project.collective_id) {
      const { data: collectiveMembership } = await admin.from('collective_members')
        .select('user_id')
        .eq('collective_id', project.collective_id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      isMember = !!collectiveMembership;
    }
  }
  if (!isSuperAdmin && !isOwner && !isMember)
    return Response.json({ error: 'Nincs hozzáférés' }, { status: 403 });

  const statusBlocked = await checkCollectiveStatus(admin, project.collective_id);
  if (statusBlocked) return statusBlocked;

  const valueHuf = hours != null && hourlyRate != null
    ? Math.round(Number(hours) * Number(hourlyRate))
    : null;

  const { data: callerProfile } = await admin.from('profiles').select('display_name').eq('id', user.id).single();

  const { data, error } = await admin.from('labour_entries').insert([{
    project_id:         projectId,
    uploaded_by:        user.id,
    date,
    labour_type:        labourType.trim(),
    hours:              hours != null ? Number(hours) : null,
    hourly_rate:        hourlyRate != null ? Number(hourlyRate) : null,
    value_huf:          valueHuf,
    description:        description || '',
    room_id:            roomId,
    unit:               unit || 'h',
    end_date:           endDate,
    counts_as_expense:  countsAsExpense,
  }]).select().single();

  if (error) {
    logAudit({ entityId: project.collective_id || user.id, userId: user.id, userName: callerProfile?.display_name || user.email, action: 'Labour entry creation failed', targetType: 'project', targetId: projectId, details: { error: error.message } });
    return Response.json({ error: error.message }, { status: 400 });
  }

  logAudit({
    entityId:   project.collective_id || user.id,
    userId:     user.id,
    userName:   callerProfile?.display_name || user.email,
    action:     'labour.added',
    targetType: 'project',
    targetId:   projectId,
    targetName: project.name,
    details:    { labour_type: labourType, hours: Number(hours), unit: unit || 'h', value_huf: valueHuf, counts_as_expense: countsAsExpense },
  });

  return Response.json({ labourEntry: data }, { status: 201 });
}

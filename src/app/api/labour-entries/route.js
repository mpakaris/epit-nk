import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, display_name').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { projectId, date, labourType, hours, hourlyRate, description, roomId, unit } = await request.json();

  if (!projectId) return Response.json({ error: 'A projekt megadása kötelező!' }, { status: 400 });
  if (!date)      return Response.json({ error: 'A dátum megadása kötelező!' }, { status: 400 });
  if (!labourType?.trim()) return Response.json({ error: 'A munkavégzés típusa kötelező!' }, { status: 400 });

  // Verify access to the project
  const { data: project } = await admin.from('projects').select('id, owner_id, created_by, collective_id, name').eq('id', projectId).single();
  if (!project) return Response.json({ error: 'Projekt nem található' }, { status: 404 });

  const isSuperAdmin = profile.role === 'superadmin';
  const isOwner = project.owner_id === user.id || project.created_by === user.id;
  let isMember = false;
  if (!isSuperAdmin && !isOwner) {
    const { data: membership } = await admin.from('project_members').select('user_id').eq('project_id', projectId).eq('user_id', user.id).maybeSingle();
    isMember = !!membership;
  }
  if (!isSuperAdmin && !isOwner && !isMember)
    return Response.json({ error: 'Nincs hozzáférés' }, { status: 403 });

  const valueHuf = Math.round(Number(hours) * Number(hourlyRate));
  const { data: callerProfile } = await admin.from('profiles').select('display_name').eq('id', user.id).single();

  const { data, error } = await admin.from('labour_entries').insert([{
    project_id:   projectId,
    uploaded_by:  user.id,
    date,
    labour_type:  labourType.trim(),
    hours:        Number(hours),
    hourly_rate:  Number(hourlyRate),
    value_huf:    valueHuf,
    description:  description || '',
    room_id:      roomId || null,
    unit:         unit || 'h',
  }]).select().single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  logAudit({
    entityId:   project.collective_id || user.id,
    userId:     user.id,
    userName:   callerProfile?.display_name || user.email,
    action:     'Munkabejegyzés rögzítve',
    targetType: 'labour_entry',
    targetId:   data.id,
    targetName: project.name,
    details:    { labour_type: labourType, hours: Number(hours), value_huf: valueHuf },
  });

  return Response.json({ labourEntry: data }, { status: 201 });
}

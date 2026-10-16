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

  const {
    projectId, valueHuf, category, description,
    imageUrl, storagePath, ocrSuggestedValue,
    roomId, aiLineItems, aiTotal,
  } = await request.json();

  if (!projectId) return Response.json({ error: 'A projekt megadása kötelező!' }, { status: 400 });
  if (!valueHuf || Number(valueHuf) <= 0) return Response.json({ error: 'Az összeg megadása kötelező!' }, { status: 400 });

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

  const { data: callerProfile } = await admin.from('profiles').select('display_name').eq('id', user.id).single();

  const { data, error } = await admin.from('invoices').insert([{
    project_id:          projectId,
    uploaded_by:         user.id,
    uploader_name:       callerProfile?.display_name || user.email,
    value_huf:           Number(valueHuf),
    ocr_suggested_value: ocrSuggestedValue ? Number(ocrSuggestedValue) : null,
    category:            category || 'Egyéb',
    description:         description || '',
    image_url:           imageUrl || '',
    storage_path:        storagePath || '',
    room_id:             roomId || null,
    ai_line_items:       aiLineItems?.length > 0 ? aiLineItems : null,
    ai_total:            aiTotal ? Number(aiTotal) : null,
  }]).select().single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  logAudit({
    entityId:   project.collective_id || user.id,
    userId:     user.id,
    userName:   callerProfile?.display_name || user.email,
    action:     'Számla feltöltve',
    targetType: 'invoice',
    targetId:   data.id,
    targetName: project.name,
    details:    { value_huf: Number(valueHuf), category },
  });

  return Response.json({ invoice: data }, { status: 201 });
}

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function requireAdmin(supabase, admin) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Unauthenticated', status: 401 };
  const { data: profile } = await admin.from('profiles').select('id, role, entity_id, display_name').eq('id', user.id).single();
  if (!profile) return { error: 'Profile not found', status: 403 };
  if (!['admin', 'superadmin'].includes(profile.role)) return { error: 'Admin required', status: 403 };
  if (profile.role !== 'superadmin' && !profile.entity_id) return { error: 'No entity assigned', status: 400 };
  return { profile };
}

// GET /api/diary/share?project_id=X — list tokens for project (admin only)
export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { profile, error, status } = await requireAdmin(supabase, admin);
  if (error) return Response.json({ error }, { status });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');
  if (!projectId) return Response.json({ error: 'Missing project_id' }, { status: 400 });

  // Verify project belongs to caller's entity
  const entityId = profile.entity_id;
  if (entityId) {
    const { data: project } = await admin.from('projects').select('id').eq('id', projectId).eq('entity_id', entityId).single();
    if (!project) return Response.json({ error: 'Project not found or access denied' }, { status: 404 });
  }

  const { data: tokens, error: tokensErr } = await admin
    .from('diary_share_tokens')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (tokensErr) return Response.json({ error: tokensErr.message }, { status: 500 });
  return Response.json({ tokens: tokens || [] });
}

// POST /api/diary/share — create share token (admin only)
export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { profile, error, status } = await requireAdmin(supabase, admin);
  if (error) return Response.json({ error }, { status });

  const body = await request.json();
  const { project_id, label, expires_at } = body;
  if (!project_id) return Response.json({ error: 'Missing project_id' }, { status: 400 });

  // Verify project belongs to caller's entity
  const { data: project } = await admin.from('projects').select('id, entity_id').eq('id', project_id).single();
  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
  if (profile.entity_id && project.entity_id !== profile.entity_id) {
    return Response.json({ error: 'Access denied — project belongs to a different entity' }, { status: 403 });
  }

  const { data: token, error: insertErr } = await admin.from('diary_share_tokens').insert([{
    project_id,
    entity_id: project.entity_id,
    label: label || null,
    created_by: profile.id,
    expires_at: expires_at || null,
  }]).select().single();

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

  logAudit({
    entityId: project.entity_id,
    userId: profile.id,
    userName: profile.display_name,
    action: 'diary_share_token_created',
    targetType: 'diary_share_token',
    targetId: token.id,
    details: { project_id, label },
  });

  return Response.json({ token }, { status: 201 });
}

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export async function PATCH(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { collective_id } = await request.json();
  const admin = createAdminClient();

  const { data: profile } = await admin.from('profiles').select('display_name').eq('id', user.id).single();
  const userName = profile?.display_name || user.email;

  // null = switch to personal context
  if (collective_id === null || collective_id === undefined) {
    await admin.from('profiles').update({ active_collective_id: null }).eq('id', user.id);
    logAudit({ userId: user.id, userName, action: 'Workspace switched to personal', targetType: 'workspace', details: { workspace_id: null } });
    return Response.json({ success: true, context: 'personal' });
  }

  // Verify the user is a member of the requested collective
  const { data: membership } = await admin
    .from('collective_members')
    .select('collective_id')
    .eq('user_id', user.id)
    .eq('collective_id', collective_id)
    .eq('status', 'active')
    .single();

  if (!membership) {
    logAudit({ userId: user.id, userName, action: 'Workspace switch denied', targetType: 'workspace', targetId: collective_id, details: { error: 'Not a member', collective_id, workspace_id: null } });
    return Response.json({ error: 'Not a member of this collective' }, { status: 403 });
  }

  const { error } = await admin
    .from('profiles')
    .update({ active_collective_id: collective_id })
    .eq('id', user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  logAudit({ userId: user.id, userName, action: 'Workspace switched to collective', targetType: 'workspace', targetId: collective_id, details: { workspace_id: collective_id } });
  return Response.json({ success: true, context: 'collective', collective_id });
}

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, display_name').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 403 });

  const { id } = await params;
  const { data: existing } = await admin.from('ideas').select('author_id, idea').eq('id', id).single();
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const isAdmin = ['admin', 'superadmin'].includes(profile.role);
  const isOwner = existing.author_id === user.id;
  if (!isOwner && !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await admin.from('ideas').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  logAudit({
    entityId:   user.id,
    userId:     user.id,
    userName:   profile.display_name || user.email,
    action:     'Ötlet törölve',
    targetType: 'idea',
    targetId:   id,
    targetName: existing.idea.slice(0, 80),
  });

  return Response.json({ ok: true });
}

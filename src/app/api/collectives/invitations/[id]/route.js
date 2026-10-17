import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(req, { params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  // Load the invitation to verify ownership
  const { data: inv, error: invErr } = await admin
    .from('collective_invitations')
    .select('id, status, collective_id')
    .eq('id', id)
    .single();

  if (invErr || !inv) return Response.json({ error: 'Invitation not found' }, { status: 404 });
  if (inv.status !== 'pending') return Response.json({ error: 'Only pending invitations can be retracted' }, { status: 409 });

  // Caller must be owner or admin of the collective
  const { data: membership } = await admin
    .from('collective_members')
    .select('role')
    .eq('collective_id', inv.collective_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error: updateErr } = await admin
    .from('collective_invitations')
    .update({ status: 'retracted' })
    .eq('id', id);

  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });

  return Response.json({ ok: true });
}

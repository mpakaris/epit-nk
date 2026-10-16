import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// DELETE — remove a member (owner can remove anyone; member can remove themselves)

export async function DELETE(req, { params }) {
  const { id, memberId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  const { data: callerMember } = await admin
    .from('collective_members')
    .select('role')
    .eq('collective_id', id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  const isSelf = memberId === user.id;
  const isOwner = callerMember?.role === 'owner';

  if (!isSelf && !isOwner) {
    return Response.json({ error: 'Nincs jogosultsága eltávolítani ezt a tagot' }, { status: 403 });
  }

  // Prevent owner from removing themselves if they're the only owner
  if (isSelf && isOwner) {
    const { count } = await admin
      .from('collective_members')
      .select('*', { count: 'exact', head: true })
      .eq('collective_id', id)
      .eq('role', 'owner')
      .eq('status', 'active');
    if (count <= 1) return Response.json({ error: 'A kollektívának legalább egy tulajdonosnak kell maradnia' }, { status: 400 });
  }

  const { error } = await admin
    .from('collective_members')
    .delete()
    .eq('collective_id', id)
    .eq('user_id', memberId);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}

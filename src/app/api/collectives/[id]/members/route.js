import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

// POST — invite a member by email

export async function POST(req, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  // Caller must be owner or admin
  const { data: callerMember } = await admin
    .from('collective_members')
    .select('role')
    .eq('collective_id', id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!callerMember || !['owner', 'admin'].includes(callerMember.role)) {
    return Response.json({ error: 'Nincs jogosultsága tagot meghívni' }, { status: 403 });
  }

  const { email } = await req.json();
  if (!email?.trim()) return Response.json({ error: 'Az e-mail cím megadása kötelező' }, { status: 400 });

  // Look up the user by email
  const { data: invitee } = await admin
    .from('profiles')
    .select('id, display_name, email')
    .eq('email', email.trim().toLowerCase())
    .single();

  if (!invitee) return Response.json({ error: 'Nincs regisztrált felhasználó ezzel az e-mail címmel' }, { status: 404 });
  if (invitee.id === user.id) return Response.json({ error: 'Saját magát nem hívhatja meg' }, { status: 400 });

  // Check if already a member
  const { data: existing } = await admin
    .from('collective_members')
    .select('id, status')
    .eq('collective_id', id)
    .eq('user_id', invitee.id)
    .single();

  if (existing) {
    return Response.json({ error: existing.status === 'active' ? 'Ez a felhasználó már tag' : 'Ez a felhasználó már meg van hívva' }, { status: 409 });
  }

  const { data: member, error: insertErr } = await admin
    .from('collective_members')
    .insert({ collective_id: id, user_id: invitee.id, role: 'contributor', status: 'active' })
    .select()
    .single();

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

  const { data: callerProfile } = await admin.from('profiles').select('display_name').eq('id', user.id).single();
  logAudit({
    entityId:   id,
    userId:     user.id,
    userName:   callerProfile?.display_name || user.email,
    action:     'Tag hozzáadva',
    targetType: 'collective_member',
    targetId:   invitee.id,
    targetName: invitee.display_name || invitee.email,
  });

  return Response.json({ member: { ...member, display_name: invitee.display_name, email: invitee.email } });
}

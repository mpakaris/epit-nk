import { createAdminClient } from '@/lib/supabase/admin';

// Public — returns invitation details for the accept/decline page
export async function GET(req, { params }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: inv, error } = await admin
    .from('collective_invitations')
    .select('id, email, status, user_id, collective_id, invited_by, collectives(name), profiles!collective_invitations_invited_by_fkey(display_name)')
    .eq('token', token)
    .single();

  if (error || !inv) return Response.json({ error: 'Invitation not found' }, { status: 404 });

  return Response.json({
    invitation: {
      id:             inv.id,
      email:          inv.email,
      status:         inv.status,
      is_existing_user: !!inv.user_id,
      collective_name: inv.collectives?.name,
      inviter_name:   inv.profiles?.display_name,
    },
  });
}

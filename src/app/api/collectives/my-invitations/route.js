import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveEffectiveUserId } from '@/lib/godMode';

export const dynamic = 'force-dynamic';

// GET — pending invitations received by the logged-in user (matched by email)
export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const userId = await resolveEffectiveUserId(request, user, admin);

  const { data: profile } = await admin
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  if (!profile?.email) return Response.json({ invitations: [] });

  const { data: invitations } = await admin
    .from('collective_invitations')
    .select('id, token, collective_id, created_at, collectives(name), profiles!collective_invitations_invited_by_fkey(display_name)')
    .ilike('email', profile.email)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const mapped = (invitations || []).map(inv => ({
    id:             inv.id,
    token:          inv.token,
    collective_id:  inv.collective_id,
    collective_name: inv.collectives?.name ?? 'Ismeretlen kollektíva',
    inviter_name:   inv.profiles?.display_name ?? null,
    created_at:     inv.created_at,
  }));

  return Response.json({ invitations: mapped });
}

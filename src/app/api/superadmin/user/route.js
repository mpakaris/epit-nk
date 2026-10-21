import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (caller?.role !== 'superadmin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id');
  if (!userId) return Response.json({ error: 'Missing id' }, { status: 400 });

  const { data: profile, error } = await admin.from('profiles').select('*').eq('id', userId).single();
  if (error || !profile) return Response.json({ error: 'Not found' }, { status: 404 });

  // Optionally return collective memberships for context switching
  const include = searchParams.get('include');
  let collectives = [];
  if (include === 'collectives') {
    const { data: memberships } = await admin
      .from('collective_members')
      .select('collective_id, role, collectives(id, name)')
      .eq('user_id', userId)
      .eq('status', 'active');
    collectives = (memberships || []).map(m => ({
      collective_id: m.collective_id,
      name: m.collectives?.name || m.collective_id,
      role: m.role,
    }));
  }

  return Response.json({ profile, collectives });
}

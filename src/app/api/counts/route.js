import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Returns aggregate document counts for the current user across ALL their workspaces
// (personal + every collective they are an active member of).
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const { data: memberships } = await admin
    .from('collective_members')
    .select('collective_id')
    .eq('user_id', user.id)
    .eq('status', 'active');

  const collectiveIds = (memberships || []).map(m => m.collective_id);

  // Build an OR filter that covers personal + all collective records
  const orFilter = collectiveIds.length > 0
    ? `and(owner_id.eq.${user.id},collective_id.is.null),collective_id.in.(${collectiveIds.join(',')})`
    : `owner_id.eq.${user.id},collective_id.is.null`;

  const [surveysRes, quotesRes, projectsRes, clientsRes] = await Promise.all([
    admin.from('surveys').select('id', { count: 'exact', head: true })
      .or(orFilter).is('deleted_at', null).neq('status', 'done'),
    admin.from('quotes').select('id', { count: 'exact', head: true })
      .or(orFilter).is('deleted_at', null),
    admin.from('projects').select('id', { count: 'exact', head: true })
      .or(orFilter).is('deleted_at', null).is('closed_at', null),
    // Clients are always personal (GDPR — never shared across collectives)
    admin.from('clients').select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id).is('deleted_at', null),
  ]);

  return Response.json({
    surveys:  surveysRes.count  ?? 0,
    quotes:   quotesRes.count   ?? 0,
    projects: projectsRes.count ?? 0,
    clients:  clientsRes.count  ?? 0,
  });
}

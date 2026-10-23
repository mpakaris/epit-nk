import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveEffectiveUserId } from '@/lib/godMode';

export const dynamic = 'force-dynamic';

// GET /api/workspace/combined
// Returns personal + all-collective surveys, quotes, projects in one shot.
// Used by the unified list pages (felmeres, ajanlatok, projektek).
export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const userId = await resolveEffectiveUserId(request, user, admin);

  // All active collective memberships for this user
  const { data: memberships } = await admin
    .from('collective_members')
    .select('collective_id, role, collectives(id, name)')
    .eq('user_id', userId)
    .eq('status', 'active');

  const collectiveIds = (memberships || []).map(m => m.collective_id);

  // Parallel fetch: personal data + collective data (when the user has collectives)
  const parallelQueries = [
    admin.from('surveys').select('*')
      .eq('owner_id', userId).is('collective_id', null).is('deleted_at', null)
      .order('date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }),
    admin.from('quotes').select('*')
      .eq('owner_id', userId).is('collective_id', null).is('deleted_at', null)
      .order('created_at', { ascending: false }),
    admin.from('projects').select('*')
      .eq('owner_id', userId).is('collective_id', null)
      .order('created_at', { ascending: false }),
  ];

  if (collectiveIds.length > 0) {
    parallelQueries.push(
      admin.from('surveys').select('*')
        .in('collective_id', collectiveIds).is('deleted_at', null)
        .order('date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
      admin.from('quotes').select('*')
        .in('collective_id', collectiveIds).is('deleted_at', null)
        .order('created_at', { ascending: false }),
      admin.from('projects').select('*')
        .in('collective_id', collectiveIds)
        .order('created_at', { ascending: false }),
    );
  }

  const results = await Promise.all(parallelQueries);

  const personalSurveys  = results[0].data || [];
  const personalQuotes   = results[1].data || [];
  const personalProjects = results[2].data || [];

  const sharedSurveys  = collectiveIds.length > 0 ? (results[3].data || []) : [];
  const sharedQuotes   = collectiveIds.length > 0 ? (results[4].data || []) : [];
  const sharedProjects = collectiveIds.length > 0 ? (results[5].data || []) : [];

  // Build collective metadata map for tagging items
  const collectiveMeta = {};
  for (const m of (memberships || [])) {
    collectiveMeta[m.collective_id] = {
      name: m.collectives?.name || 'Kollektíva',
      role: m.role,
    };
  }

  const tagItems = (items) => items.map(item => ({
    ...item,
    _collective_name: collectiveMeta[item.collective_id]?.name ?? null,
  }));

  return Response.json({
    personal: {
      surveys:  personalSurveys,
      quotes:   personalQuotes,
      projects: personalProjects,
    },
    shared: {
      surveys:  tagItems(sharedSurveys),
      quotes:   tagItems(sharedQuotes),
      projects: tagItems(sharedProjects),
    },
    collectives: (memberships || []).map(m => ({
      id:   m.collective_id,
      name: m.collectives?.name || 'Kollektíva',
      role: m.role,
    })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/surveys/for-offer-template?collective_id=<uuid>
 *
 * Returns the surveys the user may use as templates when creating a new offer.
 * Matrix:
 *   - Personal offer (no collective_id)  → personal surveys only
 *   - Collective offer (collective_id)   → personal surveys + same-collective surveys
 *
 * Never returns surveys from other collectives.
 * Each survey is tagged with a `_source` field: 'personal' | 'collective'.
 */
export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const collectiveId = searchParams.get('collective_id') || null;

  // Verify membership when a collective is requested
  if (collectiveId) {
    const { data: mem } = await admin
      .from('collective_members')
      .select('role')
      .eq('collective_id', collectiveId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    if (!mem) return Response.json({ error: 'Nem vagy tagja ennek a kollektívának.' }, { status: 403 });
  }

  const baseQuery = () =>
    admin
      .from('surveys')
      .select('id, title, location, date, client_id, notes, collective_id, owner_id')
      .is('deleted_at', null)
      .order('date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

  // Always fetch personal surveys
  const { data: personalSurveys } = await baseQuery()
    .eq('owner_id', user.id)
    .is('collective_id', null);

  const tagged = (personalSurveys || []).map(s => ({ ...s, _source: 'personal' }));

  if (collectiveId) {
    const { data: collectiveSurveys } = await baseQuery()
      .eq('collective_id', collectiveId);
    const taggedCollective = (collectiveSurveys || []).map(s => ({ ...s, _source: 'collective' }));
    return Response.json({ surveys: [...taggedCollective, ...tagged] });
  }

  return Response.json({ surveys: tagged });
}

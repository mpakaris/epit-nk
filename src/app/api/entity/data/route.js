import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, active_collective_id')
    .eq('id', user.id)
    .single();

  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 403 });

  let collectiveId = null;
  let userId = user.id;

  if (profile.role === 'superadmin') {
    const cookieHeader = request.headers.get('cookie') || '';
    const userMatch     = cookieHeader.match(/god_mode_user=([a-f0-9-]+)/);
    const entityMatch   = cookieHeader.match(/god_mode_entity=([a-f0-9-]+)/);
    if (!userMatch) return Response.json({ error: 'No god mode user set' }, { status: 400 });
    userId      = userMatch[1];
    collectiveId = entityMatch ? entityMatch[1] : null;
  } else {
    collectiveId = profile.active_collective_id || null;
  }
  const isPersonal = !collectiveId;

  // ── Projects ─────────────────────────────────────────────────────────────
  let projectsQuery = admin.from('projects').select('*').order('created_at', { ascending: false });
  if (isPersonal) {
    projectsQuery = projectsQuery.eq('owner_id', userId).is('collective_id', null);
  } else {
    projectsQuery = projectsQuery.or(`collective_id.eq.${collectiveId},and(owner_id.eq.${userId},collective_id.is.null)`);
  }
  const projectsRes = await projectsQuery;

  // ── Quotes ────────────────────────────────────────────────────────────────
  let quotesQuery = admin.from('quotes').select('*').order('created_at', { ascending: false });
  if (isPersonal) {
    quotesQuery = quotesQuery.eq('owner_id', userId).is('collective_id', null);
  } else {
    quotesQuery = quotesQuery.or(`collective_id.eq.${collectiveId},and(owner_id.eq.${userId},collective_id.is.null)`);
  }
  const quotesRes = await quotesQuery;

  // ── Surveys ───────────────────────────────────────────────────────────────
  let surveysQuery = admin.from('surveys').select('*')
    .order('date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (isPersonal) {
    surveysQuery = surveysQuery.eq('owner_id', userId).is('collective_id', null);
  } else {
    surveysQuery = surveysQuery.or(`collective_id.eq.${collectiveId},and(owner_id.eq.${userId},collective_id.is.null)`);
  }
  const surveysRes = await surveysQuery;

  // ── Clients — always personal (owner_id = current user) ──────────────────
  const clientsRes = await admin
    .from('clients')
    .select('*')
    .eq('owner_id', userId)
    .order('name');

  // ── Users ─────────────────────────────────────────────────────────────────
  let usersData = [];
  if (isPersonal) {
    const { data: me } = await admin.from('profiles').select('*').eq('id', userId).single();
    usersData = me ? [me] : [];
  } else {
    const { data: members } = await admin
      .from('collective_members')
      .select('user_id, role, profiles(*)')
      .eq('collective_id', collectiveId)
      .eq('status', 'active');
    usersData = (members || []).map(m => ({ ...m.profiles, collective_role: m.role }));
  }

  const projects   = projectsRes.data || [];
  const quotes     = quotesRes.data   || [];
  const projectIds = projects.map(p => p.id);
  const quoteIds   = quotes.map(q => q.id);

  const [projectMembersRes, invoicesRes, labourRes, quoteEntriesRes, quoteSectionsRes, projectRoomsRes] = await Promise.all([
    projectIds.length > 0
      ? admin.from('project_members').select('project_id, user_id').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? admin.from('invoices').select('*').in('project_id', projectIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? admin.from('labour_entries').select('*').in('project_id', projectIds).order('date', { ascending: false })
      : Promise.resolve({ data: [] }),
    quoteIds.length > 0
      ? admin.from('quote_entries').select('*').in('quote_id', quoteIds).order('created_at')
      : Promise.resolve({ data: [] }),
    quoteIds.length > 0
      ? admin.from('quote_sections').select('*').in('quote_id', quoteIds).order('sort_order').order('created_at')
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? admin.from('project_rooms').select('*').in('project_id', projectIds).order('sort_order').order('created_at')
      : Promise.resolve({ data: [] }),
  ]);

  const projectMembers = projectMembersRes.data || [];
  const projectsWithMembers = projects.map(p => ({
    ...p,
    members: projectMembers.filter(pm => pm.project_id === p.id).map(pm => pm.user_id),
  }));

  return Response.json({
    users:         usersData,
    projects:      projectsWithMembers,
    invoices:      invoicesRes.data      || [],
    labourEntries: labourRes.data        || [],
    clients:       clientsRes.data       || [],
    quotes,
    quoteEntries:  quoteEntriesRes.data  || [],
    quoteSections: quoteSectionsRes.data || [],
    surveys:       surveysRes.data       || [],
    projectRooms:  projectRoomsRes.data  || [],
    isPersonal,
    collectiveId,
  });
}

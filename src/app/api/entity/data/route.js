import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

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
    projectsQuery = projectsQuery.eq('collective_id', collectiveId);
  }
  const projectsRes = await projectsQuery;

  // ── Quotes ────────────────────────────────────────────────────────────────
  let quotesQuery = admin.from('quotes').select('*').is('deleted_at', null).order('created_at', { ascending: false });
  if (isPersonal) {
    quotesQuery = quotesQuery.eq('owner_id', userId).is('collective_id', null);
  } else {
    quotesQuery = quotesQuery.eq('collective_id', collectiveId);
  }
  const quotesRes = await quotesQuery;

  // ── Surveys ───────────────────────────────────────────────────────────────
  let surveysQuery = admin.from('surveys').select('*').is('deleted_at', null)
    .order('date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (isPersonal) {
    surveysQuery = surveysQuery.eq('owner_id', userId).is('collective_id', null);
  } else {
    surveysQuery = surveysQuery.eq('collective_id', collectiveId);
  }
  const surveysRes = await surveysQuery;
  const realSurveys = surveysRes.data || [];

  // ── Clients ───────────────────────────────────────────────────────────────
  let collectiveRole = null;
  let clientsData = [];

  if (isPersonal) {
    const { data } = await admin
      .from('clients')
      .select('*, client_collective_shares(collective_id)')
      .eq('owner_id', userId)
      .order('name');
    clientsData = data || [];
  } else {
    const { data: membership } = await admin
      .from('collective_members')
      .select('role')
      .eq('collective_id', collectiveId)
      .eq('user_id', userId)
      .single();
    collectiveRole = membership?.role || null;

    const { data: shares } = await admin
      .from('client_collective_shares')
      .select('client_id')
      .eq('collective_id', collectiveId);
    const sharedIds = (shares || []).map(s => s.client_id);

    if (collectiveRole === 'owner' || collectiveRole === 'admin') {
      // Owner/admin: only explicitly shared clients, full data
      if (sharedIds.length > 0) {
        const { data } = await admin
          .from('clients')
          .select('*, client_collective_shares(collective_id)')
          .in('id', sharedIds)
          .order('name');
        clientsData = data || [];
      }
    } else {
      // Contributor: only explicitly shared clients, name-only (GDPR)
      if (sharedIds.length > 0) {
        const { data } = await admin
          .from('clients')
          .select('id, name')
          .in('id', sharedIds)
          .order('name');
        clientsData = data || [];
      }
    }
  }

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

  // ── Survey counts (layouts, photos, drawings) ─────────────────────────────
  const surveyIds = realSurveys.map(s => s.id);
  const [surveyMediaCountRes, surveyDrawingCountRes] = await Promise.all([
    surveyIds.length > 0
      ? admin.from('survey_media').select('survey_id, media_type, entry_id').in('survey_id', surveyIds)
      : Promise.resolve({ data: [] }),
    surveyIds.length > 0
      ? admin.from('survey_drawings').select('survey_id').in('survey_id', surveyIds)
      : Promise.resolve({ data: [] }),
  ]);

  const mediaCounts = {};
  for (const m of (surveyMediaCountRes.data || [])) {
    if (!mediaCounts[m.survey_id]) mediaCounts[m.survey_id] = { layouts: 0, photos: 0 };
    if (!m.entry_id && m.media_type === 'layout') mediaCounts[m.survey_id].layouts++;
    else mediaCounts[m.survey_id].photos++;
  }
  const drawingCounts = {};
  for (const d of (surveyDrawingCountRes.data || [])) {
    drawingCounts[d.survey_id] = (drawingCounts[d.survey_id] || 0) + 1;
  }

  const surveysWithCounts = realSurveys.map(s => ({
    ...s,
    _layout_count:  mediaCounts[s.id]?.layouts  || 0,
    _photo_count:   mediaCounts[s.id]?.photos   || 0,
    _drawing_count: drawingCounts[s.id]         || 0,
  }));

  return Response.json({
    users:         usersData,
    projects:      projectsWithMembers,
    invoices:      invoicesRes.data      || [],
    labourEntries: labourRes.data        || [],
    clients:       clientsData,
    quotes,
    quoteEntries:  quoteEntriesRes.data  || [],
    quoteSections: quoteSectionsRes.data || [],
    surveys:       surveysWithCounts,
    projectRooms:  projectRoomsRes.data  || [],
    isPersonal,
    collectiveId,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

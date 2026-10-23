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
  // Always return personal + shared-with-me clients regardless of active workspace.
  // Shared clients get a _shared_via marker so the UI can split them into two sections.
  const { data: personalClients } = await admin
    .from('clients')
    .select('*, client_collective_shares(collective_id)')
    .eq('owner_id', userId)
    .is('deleted_at', null)
    .order('name');

  const { data: userMemberships } = await admin
    .from('collective_members')
    .select('collective_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  const userCollectiveIds = (userMemberships || []).map(m => m.collective_id);
  const personalClientIds = new Set((personalClients || []).map(c => c.id));

  let sharedClients = [];
  if (userCollectiveIds.length > 0) {
    const { data: shares } = await admin
      .from('client_collective_shares')
      .select('client_id, collective_id, collectives(name)')
      .in('collective_id', userCollectiveIds);

    const sharesByClient = {};
    for (const s of (shares || [])) {
      if (personalClientIds.has(s.client_id)) continue;
      if (!sharesByClient[s.client_id]) sharesByClient[s.client_id] = [];
      sharesByClient[s.client_id].push({
        collective_id: s.collective_id,
        collective_name: s.collectives?.name || null,
      });
    }

    const foreignIds = Object.keys(sharesByClient);
    if (foreignIds.length > 0) {
      const { data: sharedClientData } = await admin
        .from('clients')
        .select('*, client_collective_shares(collective_id)')
        .in('id', foreignIds)
        .is('deleted_at', null)
        .order('name');

      sharedClients = (sharedClientData || []).map(c => ({
        ...c,
        _shared_via: sharesByClient[c.id] || [],
      }));
    }
  }

  const clientsData = [...(personalClients || []), ...sharedClients];

  // ── Users ─────────────────────────────────────────────────────────────────
  let usersData = [];
  if (isPersonal) {
    const { data: me } = await admin.from('profiles').select('*').eq('id', userId).single();
    usersData = me ? [me] : [];
  } else {
    const { data: members } = await admin
      .from('collective_members')
      .select('user_id, role')
      .eq('collective_id', collectiveId)
      .eq('status', 'active');
    const memberIds = (members || []).map(m => m.user_id);
    const { data: memberProfiles } = memberIds.length > 0
      ? await admin.from('profiles').select('*').in('id', memberIds)
      : { data: [] };
    usersData = (members || []).map(m => {
      const profile = (memberProfiles || []).find(p => p.id === m.user_id);
      return profile ? { ...profile, collective_role: m.role } : null;
    }).filter(Boolean);
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

  // ── Diary photo previews (first 4 photos per project for card strip) ──────
  let projectPreviewUrls = {};
  if (projectIds.length > 0) {
    const { data: diaryEntryRows } = await admin
      .from('diary_entries')
      .select('id, project_id')
      .in('project_id', projectIds)
      .order('entry_date', { ascending: false });
    const diaryEntryIds = (diaryEntryRows || []).map(e => e.id);
    const entryProjectMap = Object.fromEntries((diaryEntryRows || []).map(e => [e.id, e.project_id]));
    if (diaryEntryIds.length > 0) {
      const { data: photoRows } = await admin
        .from('diary_photos')
        .select('entry_id, mime_type, thumbnail_url, drive_view_url')
        .in('entry_id', diaryEntryIds)
        .not('drive_view_url', 'is', null)
        .order('created_at', { ascending: false });
      for (const ph of (photoRows || [])) {
        const pid = entryProjectMap[ph.entry_id];
        if (!pid) continue;
        if (!(ph.mime_type || '').startsWith('image/')) continue;
        if (!projectPreviewUrls[pid]) projectPreviewUrls[pid] = [];
        if (projectPreviewUrls[pid].length < 4) {
          projectPreviewUrls[pid].push(ph.thumbnail_url || ph.drive_view_url);
        }
      }
    }
  }

  const projectsWithMembers = projects.map(p => ({
    ...p,
    members:       projectMembers.filter(pm => pm.project_id === p.id).map(pm => pm.user_id),
    _preview_urls: projectPreviewUrls[p.id] || [],
  }));

  // ── Survey counts (layouts, photos, drawings, sections) + preview thumbnails
  const surveyIds = realSurveys.map(s => s.id);
  const [surveyMediaCountRes, surveyDrawingCountRes, surveyEntryCountRes] = await Promise.all([
    surveyIds.length > 0
      ? admin.from('survey_media').select('survey_id, media_type, entry_id, mime_type, thumbnail_url, drive_view_url').in('survey_id', surveyIds)
      : Promise.resolve({ data: [] }),
    surveyIds.length > 0
      ? admin.from('survey_drawings').select('survey_id').in('survey_id', surveyIds)
      : Promise.resolve({ data: [] }),
    surveyIds.length > 0
      ? admin.from('survey_entries').select('survey_id').in('survey_id', surveyIds)
      : Promise.resolve({ data: [] }),
  ]);

  const mediaCounts   = {};
  const mediaPreviews = {};
  for (const m of (surveyMediaCountRes.data || [])) {
    if (!mediaCounts[m.survey_id]) mediaCounts[m.survey_id] = { layouts: 0, photos: 0 };
    if (!m.entry_id && m.media_type === 'layout') {
      mediaCounts[m.survey_id].layouts++;
    } else {
      mediaCounts[m.survey_id].photos++;
      const isImage = (m.mime_type || '').startsWith('image/');
      const url = m.thumbnail_url || m.drive_view_url;
      if (isImage && url) {
        if (!mediaPreviews[m.survey_id]) mediaPreviews[m.survey_id] = [];
        if (mediaPreviews[m.survey_id].length < 4) mediaPreviews[m.survey_id].push(url);
      }
    }
  }
  const drawingCounts = {};
  for (const d of (surveyDrawingCountRes.data || [])) {
    drawingCounts[d.survey_id] = (drawingCounts[d.survey_id] || 0) + 1;
  }
  const entryCounts = {};
  for (const e of (surveyEntryCountRes.data || [])) {
    entryCounts[e.survey_id] = (entryCounts[e.survey_id] || 0) + 1;
  }

  const surveysWithCounts = realSurveys.map(s => ({
    ...s,
    _layout_count:   mediaCounts[s.id]?.layouts  || 0,
    _photo_count:    mediaCounts[s.id]?.photos    || 0,
    _drawing_count:  drawingCounts[s.id]          || 0,
    _section_count:  entryCounts[s.id]            || 0,
    _preview_urls:   mediaPreviews[s.id]          || [],
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

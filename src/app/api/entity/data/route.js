import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, entity_id, current_entity_id').eq('id', user.id).single();

  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 403 });

  let entityId;
  if (profile.role === 'superadmin') {
    // SA in god mode: read entity from the god_mode_entity cookie
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/god_mode_entity=([a-f0-9-]+)/);
    entityId = match ? match[1] : null;
    if (!entityId) return Response.json({ error: 'No god mode entity set' }, { status: 400 });
  } else {
    entityId = profile.current_entity_id || profile.entity_id;
    if (!entityId) return Response.json({ error: 'No entity assigned to this user' }, { status: 400 });
  }

  const [usersRes, projectsRes, clientsRes, quotesRes, surveysRes, entityInfoRes] = await Promise.all([
    admin.from('profiles').select('*').eq('entity_id', entityId).order('display_name'),
    admin.from('projects').select('*').eq('entity_id', entityId).order('created_at', { ascending: false }),
    admin.from('clients').select('*').eq('entity_id', entityId).order('name'),
    admin.from('quotes').select('*').eq('entity_id', entityId).order('created_at', { ascending: false }),
    admin.from('surveys').select('*').eq('entity_id', entityId).order('date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }),
    admin.from('entities').select('type').eq('id', entityId).single(),
  ]);

  const isPersonalEntity = entityInfoRes.data?.type === 'personal';

  const projects = projectsRes.data || [];
  const projectIds = projects.map(p => p.id);
  const quotes = quotesRes.data || [];
  const quoteIds = quotes.map(q => q.id);

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

  // ── Users: personal context only has the owner ──────────────────────────────
  let usersData = usersRes.data || [];
  if (isPersonalEntity) {
    const { data: ownerProfile } = await admin.from('profiles').select('*').eq('id', user.id).single();
    usersData = ownerProfile ? [ownerProfile] : [];
  }

  // ── Cross-entity clients (collective context only) ─────────────────────────
  //  Rule:
  //   1. Current user's own personal clients → selectable in pickers (is_personal_client)
  //   2. Other members' personal clients referenced by a project/quote in this
  //      collective → included for name-resolution display only (display_only)
  //      They never appear in client lists or pickers.
  let allClients = clientsRes.data || [];
  if (!isPersonalEntity) {
    // Find the current user's personal entity
    const { data: myMemberships } = await admin
      .from('memberships')
      .select('entity_id, entities(type)')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const myPersonalEntityId = (myMemberships || [])
      .find(m => m.entities?.type === 'personal')?.entity_id || null;

    // 1. My own personal clients (selectable)
    if (myPersonalEntityId) {
      const { data: myPersonalClients } = await admin
        .from('clients')
        .select('*')
        .eq('entity_id', myPersonalEntityId)
        .order('name');

      const tagged = (myPersonalClients || []).map(c => ({
        ...c,
        is_personal_client: true,
        personal_owner_name: null, // it's mine, no need for owner label
      }));
      allClients = [...allClients, ...tagged];
    }

    // 2. Any client referenced by a collective project/quote that isn't already loaded
    //    (could be another member's personal client) — display-only for name resolution
    const collectiveClientIds = new Set(allClients.map(c => c.id));
    const referencedIds = [
      ...(projects.map(p => p.client_id).filter(Boolean)),
      ...(quotes.map(q => q.client_id).filter(Boolean)),
    ].filter(id => !collectiveClientIds.has(id));
    const uniqueReferenced = [...new Set(referencedIds)];

    if (uniqueReferenced.length > 0) {
      const { data: refClients } = await admin
        .from('clients')
        .select('*')
        .in('id', uniqueReferenced);

      const displayOnly = (refClients || []).map(c => ({
        ...c,
        is_personal_client: true,
        display_only: true, // excluded from lists and pickers; only for name resolution
      }));
      allClients = [...allClients, ...displayOnly];
    }
  }

  return Response.json({
    users:          usersData,
    projects:       projectsWithMembers,
    invoices:       invoicesRes.data || [],
    labourEntries:  labourRes.data || [],
    clients:        allClients,
    quotes,
    quoteEntries:   quoteEntriesRes.data || [],
    quoteSections:  quoteSectionsRes.data || [],
    surveys:        surveysRes.data || [],
    projectRooms:   projectRoomsRes.data || [],
  });
}

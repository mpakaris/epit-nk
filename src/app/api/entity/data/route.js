import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, entity_id, current_entity_id').eq('id', user.id).single();

  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 403 });
  if (profile.role === 'superadmin') return Response.json({ error: 'Use /api/superadmin/data' }, { status: 400 });

  const entityId = profile.current_entity_id || profile.entity_id;
  if (!entityId) return Response.json({ error: 'No entity assigned to this user' }, { status: 400 });

  const [usersRes, projectsRes, clientsRes, quotesRes, surveysRes, templatesRes, entityInfoRes] = await Promise.all([
    admin.from('profiles').select('*').eq('entity_id', entityId).order('display_name'),
    admin.from('projects').select('*').eq('entity_id', entityId).order('created_at', { ascending: false }),
    admin.from('clients').select('*').eq('entity_id', entityId).order('name'),
    admin.from('quotes').select('*').eq('entity_id', entityId).order('created_at', { ascending: false }),
    admin.from('surveys').select('*').eq('entity_id', entityId).order('date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }),
    admin.from('quote_templates').select('*').eq('entity_id', entityId).order('name'),
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

  // ── Cross-entity clients: in collective context, also include personal clients
  //    belonging to entity members. Personal clients remain read-only from here.
  let allClients = clientsRes.data || [];
  if (!isPersonalEntity && usersData.length > 0) {
    const memberIds = usersData.map(u => u.id);
    const { data: personalMemberships } = await admin
      .from('memberships')
      .select('user_id, entity_id, entities(type)')
      .in('user_id', memberIds)
      .eq('status', 'active');

    const personalEntityToOwner = {};
    for (const m of personalMemberships || []) {
      if (m.entities?.type === 'personal') {
        const owner = usersData.find(u => u.id === m.user_id);
        personalEntityToOwner[m.entity_id] = owner?.display_name || null;
      }
    }

    const personalEntityIds = Object.keys(personalEntityToOwner);
    if (personalEntityIds.length > 0) {
      const { data: personalClients } = await admin
        .from('clients')
        .select('*')
        .in('entity_id', personalEntityIds)
        .order('name');

      const tagged = (personalClients || []).map(c => ({
        ...c,
        is_personal_client: true,
        personal_owner_name: personalEntityToOwner[c.entity_id] || null,
      }));
      allClients = [...allClients, ...tagged];
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
    templates:      templatesRes.data || [],
    projectRooms:   projectRoomsRes.data || [],
  });
}

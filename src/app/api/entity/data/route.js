import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, entity_id').eq('id', user.id).single();

  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 403 });
  if (profile.role === 'superadmin') return Response.json({ error: 'Use /api/superadmin/data' }, { status: 400 });
  if (!profile.entity_id) return Response.json({ error: 'No entity assigned to this user' }, { status: 400 });

  const entityId = profile.entity_id;

  const [usersRes, projectsRes, clientsRes, quotesRes, surveysRes] = await Promise.all([
    admin.from('profiles').select('*').eq('entity_id', entityId).order('display_name'),
    admin.from('projects').select('*').eq('entity_id', entityId).order('created_at', { ascending: false }),
    admin.from('clients').select('*').eq('entity_id', entityId).order('name'),
    admin.from('quotes').select('*').eq('entity_id', entityId).order('created_at', { ascending: false }),
    admin.from('surveys').select('*').eq('entity_id', entityId).order('date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }),
  ]);

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

  return Response.json({
    users:          usersRes.data || [],
    projects:       projectsWithMembers,
    invoices:       invoicesRes.data || [],
    labourEntries:  labourRes.data || [],
    clients:        clientsRes.data || [],
    quotes,
    quoteEntries:   quoteEntriesRes.data || [],
    quoteSections:  quoteSectionsRes.data || [],
    surveys:        surveysRes.data || [],
    projectRooms:   projectRoomsRes.data || [],
  });
}

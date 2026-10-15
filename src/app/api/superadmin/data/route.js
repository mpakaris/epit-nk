import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  // Verify the caller is actually superadmin
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'superadmin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const [
    { data: entities },
    { data: users },
    { data: projects },
    { data: projectMembers },
    { data: invoices },
    { data: labourEntries },
    { data: clients },
    { data: quotes },
    { data: quoteEntries },
    { data: quoteSections },
  ] = await Promise.all([
    admin.from('entities').select('*').order('name'),
    admin.from('profiles').select('*').order('display_name'),
    admin.from('projects').select('*').order('created_at', { ascending: false }),
    admin.from('project_members').select('project_id, user_id'),
    admin.from('invoices').select('*').order('created_at', { ascending: false }),
    admin.from('labour_entries').select('*').order('date', { ascending: false }),
    admin.from('clients').select('*').order('name'),
    admin.from('quotes').select('*').order('created_at', { ascending: false }),
    admin.from('quote_entries').select('*').order('created_at'),
    admin.from('quote_sections').select('*').order('sort_order').order('created_at'),
  ]);

  // Fetch all active memberships (used for entity stats, handleJump, and personal entity lookup)
  const { data: allMembershipsRaw } = await admin
    .from('memberships')
    .select('user_id, entity_id, role, status, entities(type), profiles!memberships_user_id_fkey(id, display_name, email, role)')
    .eq('status', 'active');

  const personalEntityByUser = {};
  const collectiveMemberships = [];
  for (const m of allMembershipsRaw || []) {
    if (m.entities?.type === 'personal') {
      personalEntityByUser[m.user_id] = m.entity_id;
    } else {
      collectiveMemberships.push({
        user_id:      m.user_id,
        entity_id:    m.entity_id,
        role:         m.role,
        display_name: m.profiles?.display_name || m.user_id,
        email:        m.profiles?.email || null,
      });
    }
  }

  // Attach members to projects (same shape as the browser query)
  const projectsWithMembers = (projects || []).map(p => ({
    ...p,
    members: (projectMembers || []).filter(pm => pm.project_id === p.id).map(pm => pm.user_id),
  }));

  const usersWithPersonal = (users || []).map(u => ({
    ...u,
    personal_entity_id: personalEntityByUser[u.id] || null,
  }));

  return Response.json({
    entities:      entities      || [],
    users:         usersWithPersonal,
    projects:      projectsWithMembers,
    invoices:      invoices      || [],
    labourEntries: labourEntries || [],
    clients:       clients       || [],
    quotes:        quotes        || [],
    quoteEntries:  quoteEntries  || [],
    quoteSections: quoteSections || [],
    allMemberships: collectiveMemberships,
  });
}

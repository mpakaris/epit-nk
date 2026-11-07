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
    { data: collectives },
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
    admin.from('collectives').select('id, name, created_at, collective_tier, subscription_status, is_inclusive').order('name'),
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

  // Fetch collective memberships (replaces old memberships table query)
  const { data: rawMembers } = await admin
    .from('collective_members')
    .select('user_id, collective_id, role, status')
    .eq('status', 'active');

  // Fetch profiles for member display names
  const memberUserIds = [...new Set((rawMembers || []).map(m => m.user_id))];
  const { data: memberProfiles } = memberUserIds.length > 0
    ? await admin.from('profiles').select('id, display_name, email').in('id', memberUserIds)
    : { data: [] };
  const profileMap = Object.fromEntries((memberProfiles || []).map(p => [p.id, p]));

  const collectiveMemberships = (rawMembers || []).map(m => ({
    user_id:      m.user_id,
    entity_id:    m.collective_id,  // alias for backward compat with superadmin pages
    role:         m.role,
    display_name: profileMap[m.user_id]?.display_name || m.user_id,
    email:        profileMap[m.user_id]?.email || null,
  }));

  // Attach members to projects (same shape as the browser query)
  const projectsWithMembers = (projects || []).map(p => ({
    ...p,
    members: (projectMembers || []).filter(pm => pm.project_id === p.id).map(pm => pm.user_id),
  }));

  // personal_entity_id no longer meaningful — personal workspace = user.id directly
  const usersWithPersonal = (users || []).map(u => ({
    ...u,
    personal_entity_id: null,
  }));

  // Map collectives to the shape superadmin pages expect (with type field)
  const entities = (collectives || []).map(c => ({ ...c, type: 'collective' }));

  return Response.json({
    entities,
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

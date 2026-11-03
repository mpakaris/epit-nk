import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ProjectsListClient from './ProjectsListClient';
import PageSpinner from '@/components/PageSpinner';

export default function ProjectsListPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ProjectsListContent />
    </Suspense>
  );
}

async function ProjectsListContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, active_collective_id, display_name')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  const isSuperAdmin = profile.role === 'superadmin';
  const isAdmin      = ['admin', 'superadmin'].includes(profile.role);

  const cookieStore = await cookies();
  let effectiveUserId = user.id;

  if (isSuperAdmin) {
    const godUser = cookieStore.get('god_mode_user')?.value || null;
    if (!godUser) redirect('/superadmin/projektek');
    effectiveUserId = godUser;
  }

  const currentUser = {
    id:           effectiveUserId,
    email:        user.email,
    display_name: profile.display_name || user.email,
    role:         profile.role,
  };

  // Personal clients (always needed)
  const { data: clientsData } = await admin
    .from('clients')
    .select('*')
    .eq('owner_id', effectiveUserId)
    .order('name');

  // All collective memberships for this user
  const { data: memberships } = await admin
    .from('collective_members')
    .select('collective_id, role, collectives(id, name)')
    .eq('user_id', effectiveUserId)
    .eq('status', 'active');

  const collectiveIds = (memberships || []).map(m => m.collective_id);

  // Parallel fetch: personal projects + collective projects
  const parallelQueries = [
    admin.from('projects').select('*').eq('owner_id', effectiveUserId).is('collective_id', null).order('created_at', { ascending: false }),
    admin.from('quotes').select('*').eq('owner_id', effectiveUserId).is('collective_id', null).order('created_at', { ascending: false }),
  ];

  if (collectiveIds.length > 0) {
    parallelQueries.push(
      admin.from('projects').select('*').in('collective_id', collectiveIds).order('created_at', { ascending: false }),
      admin.from('quotes').select('*').in('collective_id', collectiveIds).order('created_at', { ascending: false }),
    );
  }

  const results = await Promise.all(parallelQueries);
  const personalProjects = results[0].data || [];
  const personalQuotes   = results[1].data || [];
  const sharedProjects   = collectiveIds.length > 0 ? (results[2].data || []) : [];
  const sharedQuotes     = collectiveIds.length > 0 ? (results[3].data || []) : [];

  const allProjects = [...personalProjects, ...sharedProjects];
  const allQuotes   = [...personalQuotes, ...sharedQuotes];
  const projectIds  = allProjects.map(p => p.id);

  // Project members + financials
  const [membersRes, invoicesRes, labourRes] = await Promise.all([
    projectIds.length > 0
      ? admin.from('project_members').select('project_id, user_id').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? admin.from('invoices').select('*').in('project_id', projectIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? admin.from('labour_entries').select('*').in('project_id', projectIds).order('date', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const allProjectMembers = membersRes.data || [];

  // Fetch user profiles (personal = just self; collective = all members)
  let usersData = [];
  const { data: meProfile } = await admin.from('profiles').select('id, display_name, email, role').eq('id', effectiveUserId).single();
  usersData = meProfile ? [meProfile] : [];

  if (collectiveIds.length > 0) {
    const { data: colMembers } = await admin
      .from('collective_members')
      .select('user_id, role, collective_id')
      .in('collective_id', collectiveIds)
      .eq('status', 'active');
    const memberIds = [...new Set((colMembers || []).map(m => m.user_id))];
    if (memberIds.length > 0) {
      const { data: memberProfiles } = await admin.from('profiles').select('id, display_name, email, role').in('id', memberIds);
      const existing = new Set(usersData.map(u => u.id));
      for (const p of (memberProfiles || [])) {
        if (!existing.has(p.id)) { usersData.push(p); existing.add(p.id); }
      }
    }
  }

  const attachMembers = (projects) => projects.map(p => ({
    ...p,
    members: allProjectMembers.filter(m => m.project_id === p.id).map(m => m.user_id),
    _collective_name: (memberships || []).find(m => m.collective_id === p.collective_id)?.collectives?.name ?? null,
  }));

  const filterForUser = (projects) =>
    isAdmin ? projects : projects.filter(p => p.members.includes(user.id) || p.owner_id === user.id);

  const collectives = (memberships || []).map(m => ({
    id:   m.collective_id,
    name: m.collectives?.name || 'Kollektíva',
    role: m.role,
  }));

  return (
    <ProjectsListClient
      personalProjects={filterForUser(attachMembers(personalProjects))}
      sharedProjects={filterForUser(attachMembers(sharedProjects))}
      collectives={collectives}
      initialInvoices={invoicesRes.data || []}
      initialLabourEntries={labourRes.data || []}
      initialUsers={usersData}
      initialClients={clientsData || []}
      initialQuotes={allQuotes}
      currentUser={currentUser}
      isAdmin={isAdmin}
      isSuperAdmin={isSuperAdmin}
    />
  );
}

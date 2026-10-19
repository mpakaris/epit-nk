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
  const isAdmin = ['admin', 'superadmin'].includes(profile.role);

  const cookieStore = await cookies();
  let collectiveId = profile.active_collective_id || null;
  let effectiveUserId = user.id;

  if (isSuperAdmin) {
    const godUser   = cookieStore.get('god_mode_user')?.value   || null;
    const godEntity = cookieStore.get('god_mode_entity')?.value || null;
    if (!godUser) redirect('/superadmin/projektek');
    effectiveUserId = godUser;
    collectiveId    = godEntity || null;
  }

  const currentUser = {
    id:           effectiveUserId,
    email:        user.email,
    display_name: profile.display_name || user.email,
    role:         profile.role,
  };

  // Projects: personal (owner_id = user, no collective) + collective if active
  const isPersonal = !collectiveId;

  const [projectsRes, clientsRes, quotesRes] = await Promise.all([
    isPersonal
      ? admin.from('projects').select('*').eq('owner_id', effectiveUserId).is('collective_id', null).order('created_at', { ascending: false })
      : admin.from('projects').select('*').eq('collective_id', collectiveId).order('created_at', { ascending: false }),
    // Clients are always personal — only the owner sees their own
    admin.from('clients').select('*').eq('owner_id', effectiveUserId).order('name'),
    isPersonal
      ? admin.from('quotes').select('*').eq('owner_id', effectiveUserId).is('collective_id', null).order('created_at', { ascending: false })
      : admin.from('quotes').select('*').eq('collective_id', collectiveId).order('created_at', { ascending: false }),
  ]);

  // Two-step users fetch to avoid ambiguous FK join (collective_members has two FKs to profiles)
  let usersData = [];
  if (collectiveId) {
    const { data: members } = await admin
      .from('collective_members')
      .select('user_id, role')
      .eq('collective_id', collectiveId)
      .eq('status', 'active');
    const memberIds = (members || []).map(m => m.user_id);
    if (memberIds.length > 0) {
      const { data: memberProfiles } = await admin
        .from('profiles')
        .select('id, display_name, email, role')
        .in('id', memberIds);
      usersData = (members || []).map(m => {
        const profile = (memberProfiles || []).find(p => p.id === m.user_id);
        return profile ? { ...profile, collective_role: m.role } : null;
      }).filter(Boolean);
    }
  } else {
    const { data: me } = await admin
      .from('profiles')
      .select('id, display_name, email, role')
      .eq('id', effectiveUserId)
      .single();
    usersData = me ? [me] : [];
  }

  const projects = projectsRes.data || [];
  const projectIds = projects.map(p => p.id);

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

  const allMembers = membersRes.data || [];
  const projectsWithMembers = projects.map(p => ({
    ...p,
    members: allMembers.filter(m => m.project_id === p.id).map(m => m.user_id),
  }));

  // Filter projects for non-admin users to only their memberships
  const effectiveProjects = isAdmin
    ? projectsWithMembers
    : projectsWithMembers.filter(p => p.members.includes(user.id));

  return (
    <ProjectsListClient
      initialProjects={effectiveProjects}
      initialInvoices={invoicesRes.data || []}
      initialLabourEntries={labourRes.data || []}
      initialUsers={usersData}
      initialClients={clientsRes.data || []}
      initialQuotes={quotesRes.data || []}
      currentUser={currentUser}
      isAdmin={isAdmin}
      isSuperAdmin={isSuperAdmin}
      impersonating={isSuperAdmin ? { collective_id: collectiveId } : null}
      effectiveEntityId={collectiveId}
    />
  );
}

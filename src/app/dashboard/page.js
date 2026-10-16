import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import PageSpinner from '@/components/PageSpinner';

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
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

  const isPersonal = !collectiveId;

  const [projectsRes, usersRes, clientsRes, quotesRes, surveysRes] = await Promise.all([
    isPersonal
      ? admin.from('projects').select('*').eq('owner_id', effectiveUserId).is('collective_id', null).order('created_at', { ascending: false })
      : admin.from('projects').select('*').eq('collective_id', collectiveId).order('created_at', { ascending: false }),
    collectiveId
      ? admin.from('collective_members').select('user_id, role, profiles(id, display_name, email, role)').eq('collective_id', collectiveId).eq('status', 'active')
      : admin.from('profiles').select('id, display_name, email, role').eq('id', effectiveUserId),
    admin.from('clients').select('*').eq('owner_id', effectiveUserId).order('name'),
    isPersonal
      ? admin.from('quotes').select('*').eq('owner_id', effectiveUserId).is('collective_id', null).order('created_at', { ascending: false })
      : admin.from('quotes').select('*').eq('collective_id', collectiveId).order('created_at', { ascending: false }),
    isPersonal
      ? admin.from('surveys').select('*').eq('owner_id', effectiveUserId).is('collective_id', null).order('created_at', { ascending: false }).limit(5)
      : admin.from('surveys').select('*').eq('collective_id', collectiveId).order('created_at', { ascending: false }).limit(5),
  ]);

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

  const effectiveProjects = isAdmin
    ? projectsWithMembers
    : projectsWithMembers.filter(p => p.members.includes(user.id));

  return (
    <DashboardClient
      initialProjects={effectiveProjects}
      initialInvoices={invoicesRes.data || []}
      initialLabourEntries={labourRes.data || []}
      initialUsers={usersRes.data || []}
      initialClients={clientsRes.data || []}
      initialQuotes={quotesRes.data || []}
      initialSurveys={surveysRes.data || []}
      currentUser={currentUser}
      isAdmin={isAdmin}
      isSuperAdmin={isSuperAdmin}
      impersonating={isSuperAdmin ? { collective_id: collectiveId } : null}
      effectiveEntityId={collectiveId}
    />
  );
}

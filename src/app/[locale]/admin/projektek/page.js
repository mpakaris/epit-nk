import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminProjectsClient from './AdminProjectsClient';
import PageSpinner from '@/components/PageSpinner';

export default function AdminProjectsPage({ params }) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <AdminProjectsContent />
    </Suspense>
  );
}

async function AdminProjectsContent() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, active_collective_id, display_name')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    redirect('/projektek');
  }

  const cookieStore = await cookies();
  let collectiveId    = profile.active_collective_id || null;
  let effectiveUserId = user.id;

  if (profile.role === 'superadmin') {
    const godUser   = cookieStore.get('god_mode_user')?.value   || null;
    const godEntity = cookieStore.get('god_mode_entity')?.value || null;
    if (!godUser) redirect('/superadmin');
    effectiveUserId = godUser;
    collectiveId    = godEntity || null;
  }

  const isPersonal = !collectiveId;

  const [usersRes, projectsRes, clientsRes] = await Promise.all([
    collectiveId
      ? admin.from('collective_members').select('user_id, role, profiles(id, display_name, email, role)').eq('collective_id', collectiveId).eq('status', 'active')
      : admin.from('profiles').select('id, display_name, email, role').eq('id', effectiveUserId),
    isPersonal
      ? admin.from('projects').select('*').eq('owner_id', effectiveUserId).is('collective_id', null).order('created_at', { ascending: false })
      : admin.from('projects').select('*').eq('collective_id', collectiveId).order('created_at', { ascending: false }),
    admin.from('clients').select('*').eq('owner_id', effectiveUserId).order('name'),
  ]);

  const projects = projectsRes.data || [];
  const projectIds = projects.map(p => p.id);

  const [membersRes, invoicesRes, labourRes, diaryRes] = await Promise.all([
    projectIds.length > 0
      ? admin.from('project_members').select('project_id, user_id').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? admin.from('invoices').select('project_id').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? admin.from('labour_entries').select('project_id').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? admin.from('diary_entries').select('project_id').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
  ]);

  const projectsWithMembers = projects.map(p => ({
    ...p,
    members: (membersRes.data || []).filter(m => m.project_id === p.id).map(m => m.user_id),
  }));

  return (
    <AdminProjectsClient
      initialProjects={projectsWithMembers}
      initialUsers={usersRes.data || []}
      initialClients={clientsRes.data || []}
      initialInvoices={invoicesRes.data || []}
      initialLabourEntries={labourRes.data || []}
      initialDiaryEntries={diaryRes.data || []}
      currentUser={{ id: user.id, email: user.email, display_name: profile.display_name || user.email, role: profile.role, entity_id: collectiveId }}
      effectiveEntityId={collectiveId}
    />
  );
}

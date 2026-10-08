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
    .select('id, role, entity_id, display_name')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  const isSuperAdmin = profile.role === 'superadmin';
  const isAdmin = ['admin', 'superadmin'].includes(profile.role);

  let entityId = profile.entity_id;
  let impersonating = null;

  if (isSuperAdmin) {
    const cookieStore = await cookies();
    const godEntity = cookieStore.get('god_mode_entity')?.value || null;
    entityId = godEntity;
    impersonating = godEntity ? { entity_id: godEntity } : null;
  }

  const currentUser = {
    id: user.id,
    email: user.email,
    display_name: profile.display_name || user.email,
    role: profile.role,
    entity_id: entityId,
  };

  if (!entityId) {
    // Superadmin without god mode — send them to their own projects dashboard
    redirect('/superadmin/projektek');
  }

  const [projectsRes, usersRes, clientsRes, quotesRes] = await Promise.all([
    admin.from('projects').select('*').eq('entity_id', entityId).order('created_at', { ascending: false }),
    admin.from('profiles').select('id, display_name, email, role, entity_id').eq('entity_id', entityId).order('display_name'),
    admin.from('clients').select('*').eq('entity_id', entityId).order('name'),
    admin.from('quotes').select('*').eq('entity_id', entityId).order('created_at', { ascending: false }),
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

  // Filter projects for non-admin users to only their memberships
  const effectiveProjects = isAdmin
    ? projectsWithMembers
    : projectsWithMembers.filter(p => p.members.includes(user.id));

  return (
    <ProjectsListClient
      initialProjects={effectiveProjects}
      initialInvoices={invoicesRes.data || []}
      initialLabourEntries={labourRes.data || []}
      initialUsers={usersRes.data || []}
      initialClients={clientsRes.data || []}
      initialQuotes={quotesRes.data || []}
      currentUser={currentUser}
      isAdmin={isAdmin}
      isSuperAdmin={isSuperAdmin}
      impersonating={impersonating}
      effectiveEntityId={entityId}
    />
  );
}

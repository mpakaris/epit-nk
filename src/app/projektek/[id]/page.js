import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import ProjectDetailClient from './ProjectDetailClient';

export default function ProjectDetailPage({ params }) {
  return (
    <Suspense fallback={
      <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Betöltés...
      </div>
    }>
      <ProjectDetailContent params={params} />
    </Suspense>
  );
}

async function ProjectDetailContent({ params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, entity_id, display_name')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  const isAdminRole = ['admin', 'superadmin'].includes(profile.role);

  let entityId = profile.entity_id;
  if (profile.role === 'superadmin') {
    const cookieStore = await cookies();
    entityId = cookieStore.get('god_mode_entity')?.value || null;
  }

  const projectQueryBuilder = admin.from('projects').select('*').eq('id', id);
  if (entityId) projectQueryBuilder.eq('entity_id', entityId);
  const { data: project } = await projectQueryBuilder.single();

  if (!project) notFound();

  const { data: memberRows } = await admin
    .from('project_members')
    .select('user_id')
    .eq('project_id', id);

  const memberIds = (memberRows || []).map(m => m.user_id);

  if (!isAdminRole && !memberIds.includes(user.id)) {
    redirect('/projektek');
  }

  const resolvedEntityId = entityId || project.entity_id;

  const [usersRes, invoicesRes, labourRes, allClientsRes, diaryCountRes, roomsRes] = await Promise.all([
    admin.from('profiles')
      .select('id, display_name, email, role, entity_id')
      .eq('entity_id', resolvedEntityId)
      .order('display_name'),
    admin.from('invoices')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    admin.from('labour_entries')
      .select('*')
      .eq('project_id', id)
      .order('date', { ascending: false }),
    admin.from('clients').select('*').eq('entity_id', resolvedEntityId).order('name'),
    admin.from('diary_entries').select('id', { count: 'exact', head: true }).eq('project_id', id).eq('entity_id', resolvedEntityId),
    admin.from('project_rooms').select('*').eq('project_id', id).order('sort_order').order('created_at'),
  ]);

  const allClients = allClientsRes.data || [];
  const client = allClients.find(c => c.id === project.client_id) || null;
  const projectWithMembers = { ...project, members: memberIds };

  return (
    <ProjectDetailClient
      project={projectWithMembers}
      initialUsers={usersRes.data || []}
      initialInvoices={invoicesRes.data || []}
      initialLabourEntries={labourRes.data || []}
      client={client}
      clients={allClients}
      currentUser={{ id: user.id, email: user.email, display_name: profile.display_name || user.email, role: profile.role, entity_id: resolvedEntityId }}
      isAdmin={isAdminRole}
      initialDiaryCount={diaryCountRes.count ?? 0}
      initialRooms={roomsRes.data || []}
    />
  );
}

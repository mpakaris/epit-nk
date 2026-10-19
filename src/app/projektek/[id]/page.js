import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import ProjectDetailClient from './ProjectDetailClient';
import PageSpinner from '@/components/PageSpinner';

export const dynamic = 'force-dynamic';

export default function ProjectDetailPage({ params }) {
  return (
    <Suspense fallback={<PageSpinner />}>
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
    .select('id, role, active_collective_id, display_name')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  const isAdminRole = ['admin', 'superadmin'].includes(profile.role);

  const cookieStore = await cookies();
  let collectiveId    = profile.active_collective_id || null;
  let effectiveUserId = user.id;

  if (profile.role === 'superadmin') {
    const godUser   = cookieStore.get('god_mode_user')?.value   || null;
    const godEntity = cookieStore.get('god_mode_entity')?.value || null;
    if (godUser) effectiveUserId = godUser;
    collectiveId = godEntity || null;
  }

  // Fetch project and verify access
  const { data: project } = await admin.from('projects').select('*').eq('id', id).single();
  if (!project) notFound();

  const isOwner = project.owner_id === effectiveUserId || project.created_by === effectiveUserId;
  const isCollectiveMember = project.collective_id && (project.collective_id === collectiveId);

  const { data: memberRows } = await admin.from('project_members').select('user_id').eq('project_id', id);
  const memberIds = (memberRows || []).map(m => m.user_id);

  if (!isAdminRole && !isOwner && !isCollectiveMember && !memberIds.includes(effectiveUserId)) {
    redirect('/projektek');
  }

  const [collectiveMembersRes, invoicesRes, labourRes, allClientsRes, diaryCountRes, roomsRes, paymentPlanRes, splitsRes] = await Promise.all([
    project.collective_id
      ? admin.from('collective_members').select('user_id, role').eq('collective_id', project.collective_id).eq('status', 'active')
      : Promise.resolve({ data: null }),
    admin.from('invoices')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    admin.from('labour_entries')
      .select('*')
      .eq('project_id', id)
      .order('date', { ascending: false }),
    admin.from('clients').select('*').eq('owner_id', effectiveUserId).order('name'),
    admin.from('diary_entries').select('id', { count: 'exact', head: true }).eq('project_id', id),
    admin.from('project_rooms').select('*').eq('project_id', id).order('sort_order').order('created_at'),
    admin.from('payment_plan_items').select('*, payment_item_files(*)').eq('project_id', id).order('sort_order').order('created_at'),
    admin.from('invoice_section_splits').select('*').eq('project_id', id),
  ]);

  const allClients = allClientsRes.data || [];
  const client = allClients.find(c => c.id === project.client_id) || null;
  const projectWithMembers = { ...project, members: memberIds };

  // Build initialUsers: two-step fetch to avoid relying on implicit FK joins
  let initialUsers = [];
  if (project.collective_id && collectiveMembersRes.data?.length > 0) {
    const collectiveMemberRows = collectiveMembersRes.data;
    const userIds = collectiveMemberRows.map(m => m.user_id);
    const { data: profileRows } = await admin.from('profiles').select('id, display_name, email, role').in('id', userIds);
    const roleByUserId = Object.fromEntries(collectiveMemberRows.map(m => [m.user_id, m.role]));
    initialUsers = (profileRows || []).map(p => ({ ...p, collective_role: roleByUserId[p.id] || 'contributor' }));
  } else if (!project.collective_id) {
    const { data: profileRow } = await admin.from('profiles').select('id, display_name, email, role').eq('id', effectiveUserId).single();
    if (profileRow) initialUsers = [profileRow];
  }

  return (
    <ProjectDetailClient
      project={projectWithMembers}
      initialUsers={initialUsers}
      initialInvoices={invoicesRes.data || []}
      initialLabourEntries={labourRes.data || []}
      client={client}
      clients={allClients}
      currentUser={{ id: effectiveUserId, email: user.email, display_name: profile.display_name || user.email, role: profile.role, active_collective_id: collectiveId }}
      isAdmin={isAdminRole || isOwner}
      initialDiaryCount={diaryCountRes.count ?? 0}
      initialRooms={roomsRes.data || []}
      initialPaymentPlan={paymentPlanRes.data || []}
      initialInvoiceSplits={splitsRes.data || []}
    />
  );
}

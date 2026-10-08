import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminProjectsClient from './AdminProjectsClient';

export default function AdminProjectsPage({ params }) {
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Betöltés...</div>}>
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
    .select('id, role, entity_id, display_name')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    redirect('/projektek');
  }

  // Superadmins have no entity_id themselves — read it from the god_mode_entity cookie
  let entityId = profile.entity_id;
  if (profile.role === 'superadmin') {
    const cookieStore = await cookies();
    entityId = cookieStore.get('god_mode_entity')?.value || null;
    if (!entityId) redirect('/superadmin');
  }

  if (!entityId) redirect('/superadmin');

  const [usersRes, projectsRes, clientsRes] = await Promise.all([
    admin.from('profiles').select('id, display_name, email, role, entity_id').eq('entity_id', entityId).order('display_name'),
    admin.from('projects').select('*').eq('entity_id', entityId).order('created_at', { ascending: false }),
    admin.from('clients').select('*').eq('entity_id', entityId).order('name'),
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
      currentUser={{ id: user.id, email: user.email, display_name: profile.display_name || user.email, role: profile.role, entity_id: entityId }}
      effectiveEntityId={entityId}
    />
  );
}

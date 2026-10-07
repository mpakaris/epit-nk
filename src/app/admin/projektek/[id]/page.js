import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import AdminProjectDetailClient from './AdminProjectDetailClient';

export default function AdminProjectDetailPage({ params }) {
  return (
    <Suspense fallback={
      <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Betöltés...
      </div>
    }>
      <AdminProjectDetailContent params={params} />
    </Suspense>
  );
}

async function AdminProjectDetailContent({ params }) {
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

  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    redirect('/projektek');
  }

  let entityId = profile.entity_id;
  if (profile.role === 'superadmin') {
    const cookieStore = await cookies();
    entityId = cookieStore.get('god_mode_entity')?.value || null;
    if (!entityId) redirect('/superadmin');
  }

  if (!entityId) redirect('/superadmin');

  const { data: project } = await admin
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('entity_id', entityId)
    .single();

  if (!project) notFound();

  const [membersRes, usersRes, clientsRes, invoicesRes, labourRes] = await Promise.all([
    admin.from('project_members').select('user_id').eq('project_id', id),
    admin.from('profiles').select('id, display_name, email, role, entity_id').eq('entity_id', entityId).order('display_name'),
    admin.from('clients').select('*').eq('entity_id', entityId).order('name'),
    admin.from('invoices').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    admin.from('labour_entries').select('*').eq('project_id', id).order('date', { ascending: false }),
  ]);

  const projectWithMembers = {
    ...project,
    members: (membersRes.data || []).map(m => m.user_id),
  };

  return (
    <AdminProjectDetailClient
      project={projectWithMembers}
      initialUsers={usersRes.data || []}
      initialClients={clientsRes.data || []}
      initialInvoices={invoicesRes.data || []}
      initialLabourEntries={labourRes.data || []}
      currentUser={{ id: user.id, email: user.email, display_name: profile.display_name || user.email, role: profile.role, entity_id: entityId }}
    />
  );
}

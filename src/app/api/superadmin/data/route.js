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
    { data: entities },
    { data: users },
    { data: projects },
    { data: projectMembers },
    { data: invoices },
    { data: labourEntries },
    { data: clients },
    { data: quotes },
    { data: quoteEntries },
  ] = await Promise.all([
    admin.from('entities').select('*').order('name'),
    admin.from('profiles').select('*').order('display_name'),
    admin.from('projects').select('*').order('created_at', { ascending: false }),
    admin.from('project_members').select('project_id, user_id'),
    admin.from('invoices').select('*').order('created_at', { ascending: false }),
    admin.from('labour_entries').select('*').order('date', { ascending: false }),
    admin.from('clients').select('*').order('name'),
    admin.from('quotes').select('*').order('created_at', { ascending: false }),
    admin.from('quote_entries').select('*').order('created_at'),
  ]);

  // Attach members to projects (same shape as the browser query)
  const projectsWithMembers = (projects || []).map(p => ({
    ...p,
    members: (projectMembers || []).filter(pm => pm.project_id === p.id).map(pm => pm.user_id),
  }));

  return Response.json({
    entities:      entities      || [],
    users:         users         || [],
    projects:      projectsWithMembers,
    invoices:      invoices      || [],
    labourEntries: labourEntries || [],
    clients:       clients       || [],
    quotes:        quotes        || [],
    quoteEntries:  quoteEntries  || [],
  });
}

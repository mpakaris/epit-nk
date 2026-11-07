import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: project } = await admin.from('projects')
    .select('owner_id, created_by, collective_id').eq('id', id).is('deleted_at', null).single();
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  const isSuperAdmin   = profile?.role === 'superadmin';
  const isProjectOwner = project.owner_id === user.id || project.created_by === user.id;

  let allowed = isSuperAdmin || isProjectOwner;
  if (!allowed && project.collective_id) {
    const { data: mem } = await admin.from('collective_members')
      .select('role').eq('collective_id', project.collective_id).eq('user_id', user.id).eq('status', 'active').maybeSingle();
    allowed = !!mem;
  }
  if (!allowed) return Response.json({ error: 'Nincs hozzáférés' }, { status: 403 });

  const { data: invoices } = await admin.from('invoices')
    .select('id').eq('project_id', id).is('deleted_at', null);
  const invoiceIds = (invoices || []).map(i => i.id);
  if (invoiceIds.length === 0) return Response.json({ media: [] });

  const { data: media } = await admin.from('invoice_media')
    .select('*').in('invoice_id', invoiceIds).order('sort_order').order('created_at');

  return Response.json({ media: media || [] });
}

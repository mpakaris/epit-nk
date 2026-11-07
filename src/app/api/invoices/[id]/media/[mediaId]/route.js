import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(request, { params }) {
  const { id, mediaId } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: invoice } = await admin.from('invoices')
    .select('project_id, uploaded_by').eq('id', id).is('deleted_at', null).single();
  if (!invoice) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: project } = await admin.from('projects')
    .select('owner_id, created_by, collective_id').eq('id', invoice.project_id).is('deleted_at', null).single();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();

  const isSuperAdmin   = profile?.role === 'superadmin';
  const isProjectOwner = project?.owner_id === user.id || project?.created_by === user.id;
  const isEntryOwner   = invoice.uploaded_by === user.id;

  let isKollektivOwner = false;
  if (!isSuperAdmin && !isProjectOwner && !isEntryOwner && project?.collective_id) {
    const { data: mem } = await admin.from('collective_members')
      .select('role').eq('collective_id', project.collective_id)
      .eq('user_id', user.id).eq('status', 'active').maybeSingle();
    isKollektivOwner = mem?.role === 'owner' || mem?.role === 'admin';
  }

  if (!isSuperAdmin && !isProjectOwner && !isEntryOwner && !isKollektivOwner)
    return Response.json({ error: 'Csak a számla feltöltője vagy a projekt tulajdonosa törölhet bizonylatot.' }, { status: 403 });

  const { error: err } = await admin.from('invoice_media')
    .delete().eq('id', mediaId).eq('invoice_id', id);
  if (err) return Response.json({ error: err.message }, { status: 400 });

  return Response.json({ ok: true });
}

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function resolveCtx(user, invoiceId) {
  const admin = createAdminClient();
  const { data: invoice } = await admin.from('invoices')
    .select('id, project_id, uploaded_by').eq('id', invoiceId).is('deleted_at', null).single();
  if (!invoice) return null;
  const { data: project } = await admin.from('projects')
    .select('id, owner_id, created_by, collective_id').eq('id', invoice.project_id).is('deleted_at', null).single();
  if (!project) return null;
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();

  const isSuperAdmin   = profile?.role === 'superadmin';
  const isProjectOwner = project.owner_id === user.id || project.created_by === user.id;
  const isEntryOwner   = invoice.uploaded_by === user.id;

  let memberRole = null;
  if (!isSuperAdmin && !isProjectOwner && !isEntryOwner && project.collective_id) {
    const { data: mem } = await admin.from('collective_members')
      .select('role').eq('collective_id', project.collective_id)
      .eq('user_id', user.id).eq('status', 'active').maybeSingle();
    memberRole = mem?.role ?? null;
  }

  return { admin, invoice, project, isSuperAdmin, isProjectOwner, isEntryOwner, memberRole };
}

// GET — any project member may view
export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const ctx = await resolveCtx(user, id);
  if (!ctx) return Response.json({ error: 'Nincs hozzáférés' }, { status: 403 });

  const canRead = ctx.isSuperAdmin || ctx.isProjectOwner || ctx.isEntryOwner || ctx.memberRole !== null;
  if (!canRead) return Response.json({ error: 'Nincs hozzáférés' }, { status: 403 });

  const { data: media } = await ctx.admin.from('invoice_media')
    .select('*').eq('invoice_id', id).order('sort_order').order('created_at');
  return Response.json({ media: media || [] });
}

// POST — entry owner OR project owner OR collective owner/admin only
export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const ctx = await resolveCtx(user, id);
  if (!ctx) return Response.json({ error: 'Nincs hozzáférés' }, { status: 403 });

  const isKollektivOwner = ctx.memberRole === 'owner' || ctx.memberRole === 'admin';
  if (!ctx.isSuperAdmin && !ctx.isProjectOwner && !ctx.isEntryOwner && !isKollektivOwner)
    return Response.json({ error: 'Csak a számla feltöltője vagy a projekt tulajdonosa adhat hozzá bizonylatot.' }, { status: 403 });

  const { image_url, storage_path, sort_order = 0 } = await request.json();
  if (!image_url) return Response.json({ error: 'image_url kötelező' }, { status: 400 });

  const { data: media, error: err } = await ctx.admin.from('invoice_media')
    .insert({ invoice_id: id, image_url, storage_path, sort_order }).select().single();
  if (err) return Response.json({ error: err.message }, { status: 400 });
  return Response.json({ media });
}

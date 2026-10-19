import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function resolveAccess(user, invoiceId) {
  const admin = createAdminClient();
  const [{ data: profile }, { data: invoice }] = await Promise.all([
    admin.from('profiles').select('role, display_name').eq('id', user.id).single(),
    admin.from('invoices').select('id, project_id, uploaded_by').eq('id', invoiceId).single(),
  ]);
  if (!profile || !invoice) return null;

  const { data: project } = await admin
    .from('projects')
    .select('id, owner_id, created_by, collective_id, name')
    .eq('id', invoice.project_id)
    .single();
  if (!project) return null;

  const isSuperAdmin  = profile.role === 'superadmin';
  const isProjectOwner = project.owner_id === user.id || project.created_by === user.id;
  const isOwnEntry    = invoice.uploaded_by === user.id;

  if (!isSuperAdmin && !isProjectOwner && !isOwnEntry) return null;

  return { admin, profile, invoice, project };
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const ctx = await resolveAccess(user, id);
  if (!ctx) return Response.json({ error: 'Nincs hozzáférés' }, { status: 403 });
  const { admin, profile, project } = ctx;

  const fields = await request.json();
  const allowed = ['value_huf', 'category', 'description', 'ai_line_items', 'ai_total'];
  const update = {};
  for (const k of allowed) if (k in fields) update[k] = fields[k];

  const { data, error } = await admin.from('invoices').update(update).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  logAudit({
    entityId:   project.collective_id || user.id,
    userId:     user.id,
    userName:   profile.display_name || user.email,
    action:     'Számla módosítva',
    targetType: 'invoice',
    targetId:   id,
    targetName: project.name,
    details:    { value_huf: update.value_huf, category: update.category },
  });

  return Response.json({ invoice: data });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const ctx = await resolveAccess(user, id);
  if (!ctx) return Response.json({ error: 'Nincs hozzáférés' }, { status: 403 });
  const { admin, profile, project } = ctx;

  const { error } = await admin.from('invoices').update({
    deleted_at:       new Date().toISOString(),
    deleted_by_name:  profile.display_name || user.email,
  }).eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  logAudit({
    entityId:   project.collective_id || user.id,
    userId:     user.id,
    userName:   profile.display_name || user.email,
    action:     'Számla törölve',
    targetType: 'invoice',
    targetId:   id,
    targetName: project.name,
  });

  return Response.json({ ok: true });
}

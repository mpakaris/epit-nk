import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function getCallerAndAppointment(id) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };

  const admin = createAdminClient();
  const { data: appt } = await admin.from('appointments').select('*').eq('id', id).is('deleted_at', null).single();
  if (!appt) return { err: 'Not found', status: 404 };

  const isOwner = appt.owner_id === user.id || appt.created_by === user.id;
  if (!isOwner) return { err: 'Forbidden', status: 403 };

  return { user, admin, appt };
}

export async function GET(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndAppointment(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { admin, appt } = ctx;

  // Check if the linked document still exists (not soft-deleted)
  let linkedDocDeleted = false;
  let linkedDocHref    = null;

  if (appt.linked_survey_id) {
    const { data } = await admin.from('surveys').select('deleted_at, title').eq('id', appt.linked_survey_id).single();
    linkedDocDeleted = !data || !!data.deleted_at;
    if (!linkedDocDeleted) linkedDocHref = `/felmeres/${appt.linked_survey_id}`;
  } else if (appt.linked_quote_id) {
    const { data } = await admin.from('quotes').select('deleted_at, title').eq('id', appt.linked_quote_id).single();
    linkedDocDeleted = !data || !!data.deleted_at;
    if (!linkedDocDeleted) linkedDocHref = `/ajanlatok/${appt.linked_quote_id}`;
  } else if (appt.linked_project_id) {
    const { data } = await admin.from('projects').select('deleted_at, name').eq('id', appt.linked_project_id).single();
    linkedDocDeleted = !data || !!data.deleted_at;
    if (!linkedDocDeleted) linkedDocHref = `/projektek/${appt.linked_project_id}`;
  }

  return Response.json({ appointment: appt, linkedDocDeleted, linkedDocHref });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndAppointment(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const body = await request.json();
  const allowed = ['title', 'date', 'time', 'client_id', 'linked_survey_id', 'linked_quote_id', 'linked_project_id', 'link_type'];
  const update = {};
  for (const k of allowed) if (k in body) update[k] = body[k];

  const { data, error } = await ctx.admin.from('appointments').update(update).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  const { data: prof } = await ctx.admin.from('profiles').select('display_name').eq('id', ctx.user.id).single();
  logAudit({
    entityId:   ctx.appt.collective_id || ctx.user.id,
    userId:     ctx.user.id,
    userName:   prof?.display_name || ctx.user.email,
    action:     'Időpont módosítva',
    targetType: 'appointment',
    targetId:   id,
    targetName: data.title,
  });

  return Response.json({ appointment: data });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndAppointment(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { error } = await ctx.admin.from('appointments').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  const { data: prof } = await ctx.admin.from('profiles').select('display_name').eq('id', ctx.user.id).single();
  logAudit({
    entityId:   ctx.appt.collective_id || ctx.user.id,
    userId:     ctx.user.id,
    userName:   prof?.display_name || ctx.user.email,
    action:     'Időpont törölve',
    targetType: 'appointment',
    targetId:   id,
    targetName: ctx.appt.title,
  });

  return Response.json({ success: true });
}

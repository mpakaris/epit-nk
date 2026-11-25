import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadToR2, deleteFromR2, r2PublicUrl } from '@/lib/r2';
import { logAudit } from '@/lib/audit';
import { randomUUID } from 'crypto';

const MAX_PDF_BYTES = 10 * 1024 * 1024;

async function authorize(id) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { err: 'Unauthenticated', status: 401 };

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, display_name').eq('id', user.id).single();
  const { data: quote }   = await admin.from('quotes').select('*').eq('id', id).is('deleted_at', null).single();
  if (!quote) return { err: 'Not found', status: 404 };

  const isOwner      = quote.owner_id === user.id || quote.created_by === user.id;
  const isSuperAdmin = profile?.role === 'superadmin';
  if (!isOwner && !isSuperAdmin) return { err: 'Forbidden', status: 403 };

  return { user, profile, admin, quote };
}

// POST — upload a new PDF and append to terms_attachments
export async function POST(request, { params }) {
  const { id } = await params;
  const ctx = await authorize(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) return Response.json({ error: 'Nincs fájl' }, { status: 400 });
  if (file.type !== 'application/pdf')  return Response.json({ error: 'Csak PDF tölthető fel' }, { status: 400 });
  if (file.size > MAX_PDF_BYTES)        return Response.json({ error: 'Max 10 MB' }, { status: 400 });

  const fileId = randomUUID();
  const r2Key  = `terms/quotes/${id}/${fileId}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try { await uploadToR2(r2Key, buffer, 'application/pdf'); }
  catch (err) { return Response.json({ error: `Feltöltési hiba: ${err.message}` }, { status: 500 }); }

  const existing   = Array.isArray(ctx.quote.terms_attachments) ? ctx.quote.terms_attachments : [];
  if (existing.length >= 5) return Response.json({ error: 'Maximum 5 melléklet adható az ajánlathoz.' }, { status: 400 });
  const newEntry   = { id: fileId, name: file.name, url: r2PublicUrl(r2Key), r2_key: r2Key, attached: true };
  const updated    = [...existing, newEntry];

  const { data, error } = await ctx.admin.from('quotes')
    .update({ terms_attachments: updated })
    .eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  logAudit({ entityId: ctx.quote.collective_id || ctx.user.id, userId: ctx.user.id, userName: ctx.profile.display_name || ctx.user.email, action: 'Quote terms uploaded', targetType: 'quote', targetId: id, targetName: ctx.quote.title, details: { filename: file.name } });
  return Response.json({ quote: data });
}

// PATCH — toggle attached on a file OR toggle attach_profile_terms
export async function PATCH(request, { params }) {
  const { id } = await params;
  const ctx = await authorize(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const body = await request.json().catch(() => ({}));

  // Toggle profile default
  if ('attach_profile_terms' in body) {
    const { data, error } = await ctx.admin.from('quotes')
      .update({ attach_profile_terms: !!body.attach_profile_terms })
      .eq('id', id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ quote: data });
  }

  // Toggle individual file
  if (body.fileId && 'attached' in body) {
    const existing = Array.isArray(ctx.quote.terms_attachments) ? ctx.quote.terms_attachments : [];
    const updated  = existing.map(f => f.id === body.fileId ? { ...f, attached: !!body.attached } : f);
    const { data, error } = await ctx.admin.from('quotes')
      .update({ terms_attachments: updated })
      .eq('id', id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ quote: data });
  }

  return Response.json({ error: 'Invalid body' }, { status: 400 });
}

// DELETE — remove a specific file by ?fileId=
export async function DELETE(request, { params }) {
  const { id } = await params;
  const ctx = await authorize(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const fileId = new URL(request.url).searchParams.get('fileId');
  if (!fileId) return Response.json({ error: 'fileId required' }, { status: 400 });

  const existing = Array.isArray(ctx.quote.terms_attachments) ? ctx.quote.terms_attachments : [];
  const target   = existing.find(f => f.id === fileId);
  if (!target)   return Response.json({ error: 'Not found' }, { status: 404 });

  try { await deleteFromR2(target.r2_key); } catch { /* ignore */ }

  const updated = existing.filter(f => f.id !== fileId);
  const { data, error } = await ctx.admin.from('quotes')
    .update({ terms_attachments: updated })
    .eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  logAudit({ entityId: ctx.quote.collective_id || ctx.user.id, userId: ctx.user.id, userName: ctx.profile.display_name || ctx.user.email, action: 'Quote terms removed', targetType: 'quote', targetId: id, targetName: ctx.quote.title, details: { filename: target.name } });
  return Response.json({ quote: data });
}

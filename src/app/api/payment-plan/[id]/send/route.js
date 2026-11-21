import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { getEmailContent, wrapEmail } from '@/lib/emailTemplates';
import { logAudit } from '@/lib/audit';
import { globalRateLimit } from '@/lib/rateLimitGlobal';

export async function POST(request, { params }) {
  const { id: itemId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { allowed } = await globalRateLimit(`invoice-send:${user.id}`, { limit: 20, windowSec: 3600 });
  if (!allowed) return Response.json({ error: 'Túl sok kérés. Kérjük, próbáld újra később.' }, { status: 429 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, display_name, locale').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  // Load item + project
  const { data: item } = await admin.from('payment_plan_items').select('*').eq('id', itemId).single();
  if (!item) return Response.json({ error: 'Tétel nem található' }, { status: 404 });

  const { data: project } = await admin.from('projects')
    .select('id, name, owner_id, created_by, collective_id, client_id, status')
    .eq('id', item.project_id).is('deleted_at', null).single();
  if (!project) return Response.json({ error: 'Projekt nem található' }, { status: 404 });
  if (project.status === 'closed' || project.status === 'expired')
    return Response.json({ error: 'Lezárt projekthez nem lehet számlát küldeni.' }, { status: 423 });

  // Permission check
  if (profile.role !== 'superadmin') {
    const isOwner = project.owner_id === user.id || project.created_by === user.id;
    let isKollektivOwner = false;
    if (!isOwner && project.collective_id) {
      const { data: mem } = await admin.from('collective_members').select('role')
        .eq('collective_id', project.collective_id).eq('user_id', user.id).eq('status', 'active').maybeSingle();
      isKollektivOwner = mem?.role === 'owner' || mem?.role === 'admin';
    }
    if (!isOwner && !isKollektivOwner) {
      logAudit({ entityId: project.collective_id || user.id, userId: user.id, userName: profile.display_name || '', action: 'Client invoice send denied', targetType: 'payment_item', targetId: itemId, details: { error: 'Permission denied' } });
      return Response.json({ error: 'Csak a projekt tulajdonosa küldhet számlát.' }, { status: 403 });
    }
  }

  // Resolve client email
  const body = await request.json().catch(() => ({}));
  const toEmailOverride = typeof body.to_email === 'string' ? body.to_email.trim() : null;
  let recipientEmail = toEmailOverride || null;
  let recipientName = '';

  if (project.client_id) {
    const { data: clientRow } = await admin.from('clients').select('name, email').eq('id', project.client_id).is('deleted_at', null).single();
    recipientName = clientRow?.name || '';
    if (!recipientEmail) recipientEmail = clientRow?.email || null;
  }
  if (!recipientEmail) return Response.json({ error: 'Nincs megadva email-cím a küldéshez. Rendelj ügyfelet a projekthez, vagy add meg az email-címet kézzel.' }, { status: 400 });

  // Get attached files
  const { data: files } = await admin.from('payment_item_files').select('id, file_url, file_name, mime_type').eq('item_id', itemId);
  if (!files?.length) return Response.json({ error: 'Nincs csatolt fájl. Tölts fel egy számlát a küldés előtt.' }, { status: 400 });

  // Build file links HTML
  const fileLinksHtml = files.map(f =>
    `<p style="margin:0 0 10px;"><a href="${f.file_url}" style="color:#2563eb;font-weight:700;font-size:14px;text-decoration:underline;">${f.file_name || 'Számla letöltése'}</a></p>`
  ).join('');

  const locale = profile.locale || 'hu';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`;
  const portalUrl = project.client_id ? `${appUrl}/portal` : appUrl;

  const fmt = (n) => Number(n).toLocaleString('hu-HU') + ' Ft';
  const vars = {
    client_name:    recipientName || 'Ügyfél',
    invoice_label:  item.label,
    invoice_amount: fmt(item.amount_huf),
    project_name:   project.name,
    file_links_html: fileLinksHtml,
    sender_name:    profile.display_name || '',
    portal_url:     portalUrl,
  };

  const { subject, bodyHtml } = getEmailContent('invoice_sent', locale, vars);
  const html = wrapEmail({ bodyHtml, senderName: profile.display_name || '' });

  const emailRes = await sendEmail({ to: recipientEmail, subject, html });
  if (!emailRes?.ok && emailRes !== true) {
    logAudit({ entityId: project.collective_id || user.id, userId: user.id, userName: profile.display_name || '', action: 'Client invoice send failed', targetType: 'payment_item', targetId: itemId, targetName: item.label, details: { error: 'Email send failed', recipient: recipientEmail } });
    return Response.json({ error: 'Az email küldése sikertelen. Kérjük, próbáld újra.' }, { status: 500 });
  }

  // Update item status → sent
  const { data: updated } = await admin.from('payment_plan_items')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', itemId).select().single();

  logAudit({ entityId: project.collective_id || user.id, userId: user.id, userName: profile.display_name || '', action: 'Client invoice sent', targetType: 'payment_item', targetId: itemId, targetName: item.label, details: { recipient: recipientEmail, amount_huf: item.amount_huf, project_id: project.id } });
  return Response.json({ item: { ...updated, files } });
}

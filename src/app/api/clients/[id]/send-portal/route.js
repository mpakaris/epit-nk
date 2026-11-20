import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { getEmailContent, wrapEmail } from '@/lib/emailTemplates';
import { logAudit } from '@/lib/audit';
import { globalRateLimit } from '@/lib/rateLimitGlobal';

export async function POST(request, { params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, display_name, locale')
    .eq('id', user.id)
    .single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  // Rate limit: 10 portal emails per user per hour
  const { allowed } = await globalRateLimit(`send-portal:${user.id}`, { limit: 10, windowSec: 3600 });
  if (!allowed) return Response.json({ error: 'Túl sok kérés. Kérjük, próbáld újra később.' }, { status: 429 });

  const { data: client } = await admin
    .from('clients')
    .select('id, name, email, owner_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  if (!client) return Response.json({ error: 'Not found' }, { status: 404 });
  if (client.owner_id !== user.id && profile.role !== 'superadmin')
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { email: recipientEmail } = await request.json();
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail))
    return Response.json({ error: 'Érvénytelen e-mail-cím.' }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.okosszaki.hu';
  const portalUrl = `${appUrl}/portal?email=${encodeURIComponent(recipientEmail)}`;
  const locale = profile.locale || 'hu';
  const senderName = profile.display_name || user.email;

  const content = getEmailContent('portal_link_sent', locale, {
    client_name:  client.name,
    client_email: recipientEmail,
    portal_url:   portalUrl,
    sender_name:  senderName,
  });

  try {
    await sendEmail({
      to:      recipientEmail,
      subject: content.subject,
      html:    wrapEmail(content.bodyHtml, content.subject, locale),
      replyTo: user.email,
    });

    logAudit({
      entityId:   user.id,
      userId:     user.id,
      userName:   senderName,
      action:     'Portal link sent',
      targetType: 'client',
      targetId:   client.id,
      targetName: client.name,
      details:    { recipient: recipientEmail },
    });

    return Response.json({ ok: true });
  } catch (err) {
    logAudit({
      entityId:   user.id,
      userId:     user.id,
      userName:   senderName,
      action:     'Portal link send failed',
      targetType: 'client',
      targetId:   client.id,
      targetName: client.name,
      details:    { error: err.message, recipient: recipientEmail },
    });
    return Response.json({ error: err.message || 'Hiba az e-mail küldésekor.' }, { status: 500 });
  }
}

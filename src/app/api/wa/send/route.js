import { createAdminClient } from '@/lib/supabase/admin';
import { toJid, jidToE164 } from '@/lib/waAssistant/jid';

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.INTERNAL_CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { chatId, text, image, document: doc, caption } = body;

  if (!chatId) return Response.json({ error: 'chatId required' }, { status: 400 });
  if (!text && !image && !doc) return Response.json({ error: 'text, image, or document required' }, { status: 400 });

  const baseUrl = process.env.WHINSELF_BASE_URL;
  if (!baseUrl) return Response.json({ error: 'WHINSELF_BASE_URL not configured' }, { status: 500 });

  const jid = chatId.includes('@') ? chatId : toJid(chatId);

  // Build Whinself payload
  let whinPayload;
  if (image) {
    whinPayload = { jid, image, ...(caption ? { caption } : {}) };
  } else if (doc) {
    whinPayload = { jid, document: doc, ...(caption ? { caption } : {}) };
  } else {
    whinPayload = { jid, text };
  }

  const res = await fetch(`${baseUrl}/wspout`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(whinPayload),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[wa/send] whingo error:', res.status, err);
    return Response.json({ error: 'send_failed', detail: err }, { status: 502 });
  }

  const admin = createAdminClient();
  const contentType = image ? 'image' : doc ? 'document' : 'text';
  await admin.from('wa_messages').insert({
    phone_number:  jidToE164(jid),
    direction:     'outbound',
    content_type:  contentType,
    content:       caption || text || null,
    media_url:     image?.url || doc?.url || null,
  });

  return Response.json({ sent: true });
}

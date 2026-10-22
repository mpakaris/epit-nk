import { createAdminClient } from '@/lib/supabase/admin';
import { toJid, jidToE164 } from '@/lib/waAssistant/jid';

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.INTERNAL_CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { chatId, text } = await request.json();
  if (!chatId || !text) {
    return Response.json({ error: 'chatId and text required' }, { status: 400 });
  }

  const baseUrl = process.env.WHINSELF_BASE_URL;
  if (!baseUrl) {
    return Response.json({ error: 'WHINSELF_BASE_URL not configured' }, { status: 500 });
  }

  // Ensure JID is in correct Baileys format
  const jid = chatId.includes('@') ? chatId : toJid(chatId);

  const res = await fetch(`${baseUrl}/wspout`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ jid, text }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[wa/send] whingo error:', res.status, err);
    return Response.json({ error: 'send_failed', detail: err }, { status: 502 });
  }

  const admin = createAdminClient();
  await admin.from('wa_messages').insert({
    phone_number:  jidToE164(jid),
    direction:     'outbound',
    content_type:  'text',
    content:       text,
  });

  return Response.json({ sent: true });
}

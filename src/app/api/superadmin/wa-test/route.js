import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { toJid, jidToE164 } from '@/lib/waAssistant/jid';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'superadmin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const baseUrl = process.env.WHINSELF_BASE_URL;
  if (!baseUrl) {
    return Response.json({ error: 'WHINSELF_BASE_URL nincs beállítva' }, { status: 500 });
  }

  const phone = process.env.WHINSELF_TEST_PHONE;
  if (!phone) {
    return Response.json({ error: 'WHINSELF_TEST_PHONE nincs beállítva' }, { status: 500 });
  }

  const message = process.env.WHINSELF_TEST_MESSAGE;
  if (!message) {
    return Response.json({ error: 'WHINSELF_TEST_MESSAGE nincs beállítva' }, { status: 500 });
  }

  const chatId = toJid(phone.trim());

  const res = await fetch(`${baseUrl}/wspout`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ jid: chatId, text: message }),
  });

  const responseText = await res.text();
  let responseBody;
  try { responseBody = JSON.parse(responseText); } catch { responseBody = { raw: responseText }; }

  if (!res.ok) {
    return Response.json({
      ok:     false,
      status: res.status,
      detail: responseBody,
    }, { status: 502 });
  }

  // Log outbound test message
  await admin.from('wa_messages').insert({
    phone_number:  jidToE164(chatId),
    direction:     'outbound',
    content_type:  'text',
    content:       message,
    action_taken:  'superadmin_test',
  });

  return Response.json({ ok: true, chatId, detail: responseBody });
}

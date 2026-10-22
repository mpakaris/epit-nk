import { createAdminClient } from '@/lib/supabase/admin';
import { resolveAccount, UNREGISTERED_REPLY } from '@/lib/waAssistant/resolveAccount';
import { toJid, jidToE164, isIndividualJid } from '@/lib/waAssistant/jid';

// Map Whinself/Baileys type string → our content_type enum (mirrors webhook handler)
function mapContentType(type) {
  if (!type) return 'text';
  const t = type.toLowerCase();
  if (t === 'conversation' || t === 'extendedtextmessage' || t === 'text' || t === 'chat') return 'text';
  if (t === 'audiovoicemessage' || t === 'audiomessage' || t === 'pttmessage' || t === 'audio' || t === 'ptt' || t === 'voice') return 'voice';
  if (t === 'imagemessage' || t === 'image') return 'image';
  if (t === 'videomessage' || t === 'video') return 'video';
  if (t === 'documentmessage' || t === 'document') return 'document';
  return 'text';
}

// Parse the raw Whinself webhook payload stored in the queue
// Whinself format: { event: { Info: { Chat, Sender, SenderAlt, ID, Type, IsFromMe, IsGroup }, Message: { ... } } }
function parsePayload(raw) {
  const p    = JSON.parse(raw);
  const info = p.event?.Info;
  const msg  = p.event?.Message;

  if (!info) return { waMessageId: null, phoneNumber: null, contentType: 'text', content: null, mediaUrl: null };

  const jid       = info.Chat || info.Sender || '';
  const phoneJid  = (jid.endsWith('@lid') && info.SenderAlt) ? info.SenderAlt : jid;
  const phoneNumber = jidToE164(phoneJid);
  const waMessageId = info.ID || null;
  const msgType     = info.Type || 'text';

  const content =
    msg?.conversation ||
    msg?.extendedTextMessage?.text ||
    msg?.imageMessage?.caption ||
    msg?.videoMessage?.caption ||
    null;

  const mediaUrl =
    msg?.imageMessage?.url ||
    msg?.videoMessage?.url ||
    msg?.audioMessage?.url ||
    msg?.documentMessage?.url ||
    null;

  return {
    waMessageId,
    phoneNumber,
    contentType: mapContentType(msgType),
    content,
    mediaUrl,
  };
}

async function sendReply(appUrl, secret, chatId, text) {
  // Normalise to Baileys JID format
  const whingoChat = chatId.includes('@') ? chatId : toJid(chatId);
  await fetch(`${appUrl}/api/wa/send`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${secret}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ chatId: whingoChat, text }),
  });
}

async function processItem(item, admin, appUrl, secret) {
  const startedAt = new Date().toISOString();
  let waMessageId, phoneNumber, contentType, content, mediaUrl;

  try {
    ({ waMessageId, phoneNumber, contentType, content, mediaUrl } = parsePayload(item.payload));
  } catch (err) {
    await admin.from('wa_processing_queue').update({
      status:       'failed',
      last_error:   'payload_parse_error: ' + err.message,
      processed_at: new Date().toISOString(),
    }).eq('id', item.id);
    return;
  }

  // Log inbound message
  const { data: waMsg } = await admin.from('wa_messages').insert({
    wa_message_id:          waMessageId,
    phone_number:           phoneNumber,
    direction:              'inbound',
    content_type:           contentType,
    content,
    media_url:              mediaUrl,
    processing_started_at:  startedAt,
  }).select('id').single();

  try {
    const account = await resolveAccount(phoneNumber);

    if (!account) {
      await sendReply(appUrl, secret, phoneNumber, UNREGISTERED_REPLY);
      await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'unregistered' });
      return;
    }

    // PHASE 1 echo bot — replaced in WA-020+ with real intent handling
    const replyText = `Üzenet fogadva: ${content || '(média)'}`;
    await sendReply(appUrl, secret, phoneNumber, replyText);

    await finalise(admin, item.id, waMsg?.id, startedAt, {
      action_taken: 'echo',
      action_result: { echo: replyText },
    });
  } catch (err) {
    console.error('[wa/process] error for item', item.id, err.message);

    const attempts = (item.attempts || 0) + 1;
    if (attempts >= 3) {
      await admin.from('wa_processing_queue').update({
        status:       'failed',
        attempts,
        last_error:   err.message,
        processed_at: new Date().toISOString(),
      }).eq('id', item.id);
    } else {
      await admin.from('wa_processing_queue').update({
        status:       'pending',
        attempts,
        last_error:   err.message,
        locked_until: null,
      }).eq('id', item.id);
    }

    if (waMsg?.id) {
      await admin.from('wa_messages').update({
        error_code:              'PROCESSING_ERROR',
        error_details:           { message: err.message, attempts },
        processing_finished_at:  new Date().toISOString(),
      }).eq('id', waMsg.id);
    }
  }
}

async function finalise(admin, queueId, waMsgId, startedAt, updates = {}) {
  await admin.from('wa_processing_queue').update({
    status:       'done',
    message_id:   waMsgId,
    processed_at: new Date().toISOString(),
  }).eq('id', queueId);

  if (waMsgId) {
    await admin.from('wa_messages').update({
      ...updates,
      processing_finished_at: new Date().toISOString(),
    }).eq('id', waMsgId);
  }
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.INTERNAL_CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const secret = process.env.INTERNAL_CRON_SECRET;

  // Claim up to 3 pending items with a 60s processing lock
  const { data: items, error: rpcError } = await admin.rpc('claim_wa_queue_items', { batch_size: 3 });

  if (rpcError) {
    console.error('[wa/process] claim RPC error:', rpcError.message, rpcError.details);
    return Response.json({ error: rpcError.message }, { status: 500 });
  }

  if (!items || items.length === 0) {
    return Response.json({ processed: 0 });
  }

  await Promise.all(items.map(item => processItem(item, admin, appUrl, secret)));

  return Response.json({ processed: items.length });
}

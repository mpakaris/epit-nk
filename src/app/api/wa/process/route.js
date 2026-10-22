import { createAdminClient } from '@/lib/supabase/admin';
import { resolveAccount, UNREGISTERED_REPLY } from '@/lib/waAssistant/resolveAccount';
import { toJid, jidToE164, isIndividualJid } from '@/lib/waAssistant/jid';

// Map whingo type string → our content_type enum (mirrors webhook handler)
function mapContentType(type) {
  if (!type) return 'text';
  const t = type.toLowerCase();
  if (t === 'chat' || t === 'text') return 'text';
  if (t === 'audio' || t === 'ptt' || t === 'voice') return 'voice';
  if (t === 'image') return 'image';
  if (t === 'video') return 'video';
  if (t === 'document') return 'document';
  return 'text';
}

// Parse the raw webhook payload stored in the queue
// TODO: update field names after WA-001 inspection
function parsePayload(raw) {
  const p = JSON.parse(raw);
  const waMessageId = p.key?.id || p.id?.id || p.id || null;
  const rawJid      = p.key?.remoteJid || p.jid || p.from || '';
  const phoneNumber = jidToE164(rawJid);
  return {
    waMessageId,
    phoneNumber,
    contentType: mapContentType(p.type),
    content:     p.body || p.caption || null,
    mediaUrl:    p.mediaUrl || null,
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.INTERNAL_CRON_SECRET;

  // Claim up to 3 pending items with a 60s processing lock
  const { data: items } = await admin.rpc('claim_wa_queue_items', { batch_size: 3 });

  if (!items || items.length === 0) {
    return Response.json({ processed: 0 });
  }

  await Promise.all(items.map(item => processItem(item, admin, appUrl, secret)));

  return Response.json({ processed: items.length });
}

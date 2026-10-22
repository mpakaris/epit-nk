import * as crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { jidToE164, isIndividualJid } from '@/lib/waAssistant/jid';

function verifySignature(payload, signature, secret) {
  const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}

// Map Whinself type + mediaType → our content_type enum.
// Returns null to signal "skip this message entirely".
function mapContentType(type, mediaType) {
  if (!type) return 'text';
  const t  = type.toLowerCase();
  const mt = (mediaType || '').toLowerCase();

  if (t === 'conversation' || t === 'extendedtextmessage' || t === 'text' || t === 'chat') return 'text';
  if (t === 'audiovoicemessage' || t === 'audiomessage' || t === 'pttmessage' || t === 'audio' || t === 'ptt' || t === 'voice') return 'voice';
  if (t === 'imagemessage' || t === 'image') return 'image';
  if (t === 'videomessage' || t === 'video') return 'video';
  if (t === 'documentmessage' || t === 'document') return 'document';

  // Whinself sends Type:"media" with MediaType indicating the actual kind
  if (t === 'media') {
    if (mt === 'image' || mt === 'photo')          return 'image';
    if (mt === 'video')                            return 'video';
    if (mt === 'audio' || mt === 'ptt')            return 'voice';
    if (mt === 'document')                         return 'document';
    if (mt === 'collection')                       return null; // album container — individual photos come as separate events
    return null; // unknown subtype — skip
  }

  return 'text';
}

// Extract fields from Whinself webhook payload
// Whinself sends: { event: { Info: { Chat, Sender, IsFromMe, IsGroup, ID, Type }, Message: { conversation, ... } }, phone, slotid }
function parsePayload(payload) {
  const info = payload.event?.Info;
  const msg  = payload.event?.Message;

  if (!info) return null;

  // Skip messages sent by the bot itself
  if (info.IsFromMe) return null;

  // Skip groups and broadcast lists
  if (info.IsGroup) return null;

  const jid = info.Chat || info.Sender;
  if (!jid || !isIndividualJid(jid)) return null;

  // @lid JIDs are opaque — use SenderAlt which carries the real phone in @s.whatsapp.net format
  const phoneJid    = (jid.endsWith('@lid') && info.SenderAlt) ? info.SenderAlt : jid;
  const phoneNumber = jidToE164(phoneJid);
  const waMessageId = info.ID || null;
  const msgType   = info.Type     || 'text';
  const mediaType = info.MediaType || '';

  const contentType = mapContentType(msgType, mediaType);
  if (contentType === null) return null; // skip (e.g. album container)

  const content =
    msg?.conversation ||
    msg?.extendedTextMessage?.text ||
    msg?.imageMessage?.caption ||
    msg?.videoMessage?.caption ||
    null;

  // Whinself uses capital URL key; keep lowercase for safety
  const mediaUrl =
    msg?.imageMessage?.URL  || msg?.imageMessage?.url  ||
    msg?.videoMessage?.URL  || msg?.videoMessage?.url  ||
    msg?.audioMessage?.URL  || msg?.audioMessage?.url  ||
    msg?.documentMessage?.URL || msg?.documentMessage?.url ||
    msg?.image?.URL  || msg?.image?.url  ||
    msg?.video?.URL  || msg?.video?.url  ||
    msg?.audio?.URL  || msg?.audio?.url  ||
    msg?.document?.URL || msg?.document?.url ||
    null;

  return { waMessageId, phoneNumber, contentType, content, mediaUrl };
}

export async function POST(request) {
  const rawBody = await request.text();

  // HMAC verification (skip if secret not configured)
  const secret = process.env.WHINSELF_WEBHOOK_SECRET;
  if (secret) {
    const signature = request.headers.get('x-hub-signature-256') || request.headers.get('x-whinself-signature');
    if (!signature || !verifySignature(rawBody, signature, secret)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const payload = JSON.parse(rawBody);

    const parsed = parsePayload(payload);
    console.log('[wh] parsed:', parsed ? `phone=${parsed.phoneNumber} type=${parsed.contentType}` : 'null (skipped)');
    if (!parsed) {
      return Response.json({ received: true, skipped: 'outbound_or_group' });
    }

    const { waMessageId, phoneNumber, contentType, content, mediaUrl } = parsed;

    if (!phoneNumber) {
      console.log('[wh] no phone — skipping');
      return Response.json({ received: true, skipped: 'no_phone' });
    }

    const admin = createAdminClient();

    // Idempotency
    if (waMessageId) {
      const { data: existing } = await admin
        .from('wa_messages')
        .select('id')
        .eq('wa_message_id', waMessageId)
        .maybeSingle();
      if (existing) {
        console.log('[wh] duplicate msgId — skipping');
        return Response.json({ received: true, duplicate: true });
      }
    }

    // Rate limit: max 100 messages per phone per hour
    const RATE_LIMIT = 100;
    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    const { count } = await admin
      .from('wa_processing_queue')
      .select('id', { count: 'exact', head: true })
      .eq('phone_number', phoneNumber)
      .gte('enqueued_at', oneHourAgo);

    if (count >= RATE_LIMIT) {
      console.log(`[wh] rate-limited ${phoneNumber} (${count}/${RATE_LIMIT} in last hour)`);
      await admin.from('wa_messages').insert({
        wa_message_id: waMessageId,
        phone_number:  phoneNumber,
        direction:     'inbound',
        content_type:  contentType,
        content,
        action_taken:  'rate_limited',
      });
      return Response.json({ received: true, rate_limited: true });
    }
    console.log(`[wh] rate check: ${count}/${RATE_LIMIT}`);

    const { error: qErr } = await admin.from('wa_processing_queue').insert({
      phone_number: phoneNumber,
      payload:      rawBody,
      status:       'pending',
    });
    if (qErr) console.error('[wh] queue insert error:', qErr.message);
    else console.log('[wh] queued OK for', phoneNumber);

    // Fire-and-forget: kick the queue worker immediately so the item is processed
    // without waiting for a DB webhook or external cron to fire.
    const origin = new URL(request.url).origin;
    fetch(`${origin}/api/wa/process`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${process.env.INTERNAL_CRON_SECRET}` },
    }).catch(err => console.error('[wa webhook] process trigger failed:', err.message));

    return Response.json({ received: true });
  } catch (err) {
    console.error('[wa webhook] error:', err.message);
    return Response.json({ received: true, error: err.message });
  }
}

import { createAdminClient } from '@/lib/supabase/admin';
import { resolveAccount, UNREGISTERED_REPLY } from '@/lib/waAssistant/resolveAccount';
import { toJid, jidToE164 } from '@/lib/waAssistant/jid';
import { loadConversation, saveConversation, appendToContextWindow } from '@/lib/waAssistant/conversation';
import { resolveClarification, formatClarificationMessage } from '@/lib/waAssistant/clarification';
import { resolveProject } from '@/lib/waAssistant/resolveProject';
import { resolveIntent } from '@/lib/waAssistant/resolveIntent';

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

// WA-050: handle VERIFY <code> command sent by an unverified number
async function handleVerify(admin, phoneNumber, content, appUrl, secret) {
  const code = content.trim().split(/\s+/)[1];
  if (!code) {
    await sendReply(appUrl, secret, phoneNumber, 'Adj meg egy kódot: VERIFY <kód>');
    return true;
  }

  const { data: account } = await admin
    .from('wa_accounts')
    .select('*')
    .eq('phone_number', phoneNumber)
    .maybeSingle();

  if (!account) {
    await sendReply(appUrl, secret, phoneNumber, 'Nincs függőben lévő összekapcsolás ehhez a számhoz.');
    return true;
  }

  const storedCode = account.permissions?._pending_code;
  const expires    = account.permissions?._code_expires;

  if (!storedCode || (expires && new Date(expires) < new Date())) {
    await sendReply(appUrl, secret, phoneNumber, 'A kód lejárt. Kérj újat az alkalmazásban.');
    return true;
  }

  if (code !== storedCode) {
    await sendReply(appUrl, secret, phoneNumber, 'Érvénytelen kód. Ellenőrizd és próbáld újra.');
    return true;
  }

  const cleanPermissions = { ...account.permissions };
  delete cleanPermissions._pending_code;
  delete cleanPermissions._code_expires;

  await admin.from('wa_accounts').update({
    verified_at:  new Date().toISOString(),
    is_active:    true,
    permissions:  cleanPermissions,
  }).eq('phone_number', phoneNumber);

  await sendReply(appUrl, secret, phoneNumber, '✓ WhatsApp fiókod összekapcsolva. Mostantól használhatod az asszisztenst!');
  return true;
}

async function dispatch(intent, extracted, account, conversation, phoneNumber, content, mediaUrl, contentType, admin, appUrl, secret) {
  // Actions not yet implemented return a "coming soon" reply
  const COMING_SOON = 'Ez a funkció hamarosan elérhető.';

  switch (intent) {
    case 'greeting': {
      const projectHint = conversation.active_project_id ? '' : '\n\nNincs aktív projekted. Írd: *projektek listája*';
      return { reply: `Szia ${account.displayName}! Miben segíthetek?${projectHint}`, action: 'greeting' };
    }

    case 'set_active_project': {
      const result = await resolveProject(content, account, conversation);
      if (result.needsClarification) {
        const { saveClarification } = await import('@/lib/waAssistant/clarification');
        await saveClarification(phoneNumber, 'project_choice', result.clarificationOptions, 'set_active_project', {});
        const reply = formatClarificationMessage('Melyik projektet választod?', result.clarificationOptions);
        return { reply, action: 'clarification_sent' };
      }
      await saveConversation(phoneNumber, { active_project_id: result.projectId, active_survey_id: null });
      return { reply: `✓ Aktív projekt: *${result.projectName}*`, action: 'set_active_project' };
    }

    case 'list_projects':
    case 'list_surveys':
    case 'create_survey':
    case 'add_survey_entry':
    case 'create_labour_entry':
    case 'create_invoice':
    case 'attach_media':
    case 'query_costs':
    case 'query_survey':
    case 'create_client':
    case 'set_active_survey':
      return { reply: COMING_SOON, action: 'not_implemented' };

    default:
      return { reply: 'Nem értettem. Írj pl. "projektek listája", "8 óra burkolás", vagy "felmérés".', action: 'unknown' };
  }
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
    // VERIFY command — handled before account check (unverified numbers need this)
    if (content && content.trim().toUpperCase().startsWith('VERIFY ')) {
      await handleVerify(admin, phoneNumber, content, appUrl, secret);
      await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'verify' });
      return;
    }

    const account = await resolveAccount(phoneNumber);
    if (!account) {
      await sendReply(appUrl, secret, phoneNumber, UNREGISTERED_REPLY);
      await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'unregistered' });
      return;
    }

    const conversation = await loadConversation(phoneNumber);

    // Check for a pending clarification first
    let dispatchIntent = null;
    let dispatchExtracted = {};

    if (conversation.pending_clarification) {
      const clarResult = await resolveClarification(phoneNumber, content, conversation);

      if (clarResult.resolved) {
        // Chosen option resolved — apply it based on clarification type
        const type = conversation.pending_clarification?.type;

        if (type === 'project_choice') {
          await saveConversation(phoneNumber, { active_project_id: clarResult.chosenOption.id, active_survey_id: null });
          await sendReply(appUrl, secret, phoneNumber, `✓ Aktív projekt: *${clarResult.chosenOption.name}*`);
          await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'project_chosen' });
          return;
        }

        if (type === 'survey_choice') {
          await saveConversation(phoneNumber, { active_survey_id: clarResult.chosenOption.id });
          await sendReply(appUrl, secret, phoneNumber, `✓ Aktív felmérés: *${clarResult.chosenOption.name}*`);
          await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'survey_chosen' });
          return;
        }

        // Other clarification types — resume original intent
        dispatchIntent   = clarResult.originalIntent;
        dispatchExtracted = clarResult.originalPayload || {};
      } else if (clarResult.cancel) {
        await sendReply(appUrl, secret, phoneNumber, 'Rendben, megszakítva.');
        await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'cancelled' });
        return;
      } else {
        // Invalid reply — re-ask
        const pc = conversation.pending_clarification;
        if (pc?.options?.length) {
          await sendReply(appUrl, secret, phoneNumber,
            formatClarificationMessage('Kérlek válassz egy számot:', pc.options));
        } else {
          await sendReply(appUrl, secret, phoneNumber, 'Nem értem a választ. Írj számot vagy "mégse".');
        }
        await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'invalid_clarification' });
        return;
      }
    }

    // Classify intent if not already set from clarification resolution
    let intentResult;
    if (dispatchIntent) {
      intentResult = { intent: dispatchIntent, confidence: 1, extracted: dispatchExtracted };
    } else {
      intentResult = await resolveIntent({
        messageText:       content,
        contentType,
        contextWindow:     conversation.context_window || [],
        activeProjectName: null,
        activeSurveyName:  null,
      });
    }

    const { intent, confidence, extracted } = intentResult;

    // Low confidence → treat as unknown
    const effectiveIntent = confidence < 0.6 ? 'unknown' : intent;

    const { reply, action } = await dispatch(
      effectiveIntent, extracted, account, conversation,
      phoneNumber, content, mediaUrl, contentType, admin, appUrl, secret
    );

    await sendReply(appUrl, secret, phoneNumber, reply);
    await appendToContextWindow(phoneNumber, 'user', content || `(${contentType})`);
    await appendToContextWindow(phoneNumber, 'assistant', reply);

    await finalise(admin, item.id, waMsg?.id, startedAt, {
      intent,
      intent_confidence: confidence,
      extracted_data:    extracted,
      action_taken:      action,
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

  const admin  = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const secret = process.env.INTERNAL_CRON_SECRET;

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

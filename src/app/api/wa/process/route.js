import { createAdminClient } from '@/lib/supabase/admin';
import { resolveAccount, UNREGISTERED_REPLY } from '@/lib/waAssistant/resolveAccount';
import { toJid, jidToE164 } from '@/lib/waAssistant/jid';
import { loadConversation, saveConversation, appendToContextWindow } from '@/lib/waAssistant/conversation';
import { resolveWorkspace } from '@/lib/waAssistant/resolveWorkspace';
import { resolveClarification, saveClarification } from '@/lib/waAssistant/clarification';
import { revertLastAction } from '@/lib/waAssistant/actions/revert';
import { buildAgentContext } from '@/lib/waAssistant/agentContext';
import { TOOL_DEFS, buildToolExecutors } from '@/lib/waAssistant/agentTools';
import { runAgentTurn } from '@/lib/waAssistant/agentLoop';
import { transcribeVoiceNote } from '@/lib/waAssistant/transcribe';

function contextAgeMinutes(conversation) {
  if (!conversation.current_context_set_at) return Infinity;
  return (Date.now() - new Date(conversation.current_context_set_at).getTime()) / 60_000;
}

// Map Whinself type + mediaType → our content_type enum
function mapContentType(type, mediaType) {
  if (!type) return 'text';
  const t  = type.toLowerCase();
  const mt = (mediaType || '').toLowerCase();

  if (t === 'conversation' || t === 'extendedtextmessage' || t === 'text' || t === 'chat') return 'text';
  if (t === 'audiovoicemessage' || t === 'audiomessage' || t === 'pttmessage' || t === 'audio' || t === 'ptt' || t === 'voice') return 'voice';
  if (t === 'imagemessage' || t === 'image') return 'image';
  if (t === 'videomessage' || t === 'video') return 'video';
  if (t === 'documentmessage' || t === 'document') return 'document';

  if (t === 'media') {
    if (mt === 'image' || mt === 'photo')  return 'image';
    if (mt === 'video')                    return 'video';
    if (mt === 'audio' || mt === 'ptt')    return 'voice';
    if (mt === 'document')                 return 'document';
    return null; // collection or unknown — skip
  }

  return 'text';
}

function parsePayload(raw) {
  const p    = JSON.parse(raw);
  const info = p.event?.Info;
  const msg  = p.event?.Message;

  if (!info) return { waMessageId: null, phoneNumber: null, contentType: 'text', content: null, mediaUrl: null };

  const jid         = info.Chat || info.Sender || '';
  const phoneJid    = (jid.endsWith('@lid') && info.SenderAlt) ? info.SenderAlt : jid;
  const phoneNumber = jidToE164(phoneJid);
  const waMessageId = info.ID || null;
  const msgType     = info.Type     || 'text';
  const mediaType   = info.MediaType || '';

  const contentType = mapContentType(msgType, mediaType);
  if (contentType === null) return { waMessageId, phoneNumber: null, contentType: 'text', content: null, mediaUrl: null };

  const content =
    msg?.conversation ||
    msg?.extendedTextMessage?.text ||
    msg?.imageMessage?.caption ||
    msg?.videoMessage?.caption ||
    null;

  // Whinself uses capital URL; keep lowercase fallback
  const mediaUrl =
    msg?.imageMessage?.URL  || msg?.imageMessage?.url  ||
    msg?.videoMessage?.URL  || msg?.videoMessage?.url  ||
    msg?.audioMessage?.URL  || msg?.audioMessage?.url  ||
    msg?.documentMessage?.URL || msg?.documentMessage?.url ||
    msg?.image?.URL  || msg?.image?.url  ||
    msg?.video?.URL  || msg?.video?.url  ||
    null;

  // mediaKey needed to decrypt WhatsApp CDN media
  const mediaKey =
    msg?.imageMessage?.mediaKey ||
    msg?.videoMessage?.mediaKey ||
    msg?.audioMessage?.mediaKey ||
    msg?.documentMessage?.mediaKey ||
    null;

  return { waMessageId, phoneNumber, contentType, content, mediaUrl, mediaKey };
}

async function sendReply(appUrl, secret, chatId, text) {
  const whingoChat = chatId.includes('@') ? chatId : toJid(chatId);
  await fetch(`${appUrl}/api/wa/send`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: whingoChat, text }),
  });
}

async function handleVerify(admin, phoneNumber, content, appUrl, secret) {
  const code = content.trim().split(/\s+/)[1];
  if (!code) {
    await sendReply(appUrl, secret, phoneNumber, 'Adj meg egy kódot: VERIFY <kód>');
    return;
  }

  const { data: account } = await admin.from('wa_accounts').select('*').eq('phone_number', phoneNumber).maybeSingle();
  if (!account) {
    await sendReply(appUrl, secret, phoneNumber, 'Nincs függőben lévő összekapcsolás ehhez a számhoz.');
    return;
  }

  const storedCode = account.permissions?._pending_code;
  const expires    = account.permissions?._code_expires;

  if (!storedCode || (expires && new Date(expires) < new Date())) {
    await sendReply(appUrl, secret, phoneNumber, 'A kód lejárt. Kérj újat az alkalmazásban.');
    return;
  }

  if (code !== storedCode) {
    await sendReply(appUrl, secret, phoneNumber, 'Érvénytelen kód. Ellenőrizd és próbáld újra.');
    return;
  }

  const cleanPerms = { ...account.permissions };
  delete cleanPerms._pending_code;
  delete cleanPerms._code_expires;

  await admin.from('wa_accounts').update({ verified_at: new Date().toISOString(), is_active: true, permissions: cleanPerms }).eq('phone_number', phoneNumber);
  await sendReply(appUrl, secret, phoneNumber, '✓ WhatsApp fiókod összekapcsolva. Mostantól használhatod az asszisztenst!');
}

function log(phone, step, data = {}) {
  const tag   = `[wa ${phone?.slice(-4) ?? '????'}]`;
  const extra = Object.keys(data).length ? ' ' + JSON.stringify(data) : '';
  console.log(`${tag} ${step}${extra}`);
}

async function processItem(item, admin, appUrl, secret) {
  const startedAt = new Date().toISOString();
  let waMessageId, phoneNumber, contentType, content, mediaUrl, mediaKey;

  try {
    ({ waMessageId, phoneNumber, contentType, content, mediaUrl, mediaKey } = parsePayload(item.payload));
  } catch (err) {
    console.error('[wa process] payload parse error:', err.message);
    await admin.from('wa_processing_queue').update({
      status: 'failed', last_error: 'payload_parse_error: ' + err.message, processed_at: new Date().toISOString(),
    }).eq('id', item.id);
    return;
  }

  const { data: waMsg } = await admin.from('wa_messages').insert({
    wa_message_id:         waMessageId,
    phone_number:          phoneNumber,
    direction:             'inbound',
    content_type:          contentType,
    content,
    media_url:             mediaUrl,
    processing_started_at: startedAt,
  }).select('id').single();

  log(phoneNumber, 'inbound', { type: contentType, preview: (content || '').slice(0, 60) });

  try {
    // ── Hard commands (bypass agent) ──────────────────────────────────────────

    // Revert last action
    if (content && ['vissza', 'revert', 'undo', 'visszavon'].includes(content.trim().toLowerCase())) {
      const conversation = await loadConversation(phoneNumber);
      const account      = await resolveAccount(phoneNumber);
      if (!account) {
        await sendReply(appUrl, secret, phoneNumber, UNREGISTERED_REPLY);
        await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'unregistered' });
        return;
      }
      const result = await revertLastAction({ conversation, phoneNumber });
      await sendReply(appUrl, secret, phoneNumber, result.reply);
      await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'revert' });
      return;
    }

    // Reset conversation state
    if (content && ['reset', 'újra', 'restart', 'újraindítás', 'törlés'].includes(content.trim().toLowerCase())) {
      const account = await resolveAccount(phoneNumber);
      await admin.from('wa_conversations').update({
        pending_clarification: null,
        active_project_id:     null,
        active_survey_id:      null,
        active_collective_id:  null,
        workspace_chosen:      false,
        last_action:           null,
        context_window:        [],
        updated_at:            new Date().toISOString(),
      }).eq('phone_number', phoneNumber);
      log(phoneNumber, 'reset');
      await sendReply(appUrl, secret, phoneNumber, '✓ Állapot törölve — friss lappal indulunk.');
      await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'reset' });
      return;
    }

    // VERIFY command — handled before account check
    if (content && content.trim().toUpperCase().startsWith('VERIFY ')) {
      await handleVerify(admin, phoneNumber, content, appUrl, secret);
      await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'verify' });
      return;
    }

    // ── Account resolution ────────────────────────────────────────────────────

    const account = await resolveAccount(phoneNumber);
    if (!account) {
      log(phoneNumber, 'unregistered');
      await sendReply(appUrl, secret, phoneNumber, UNREGISTERED_REPLY);
      await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'unregistered' });
      return;
    }
    log(phoneNumber, 'account', { type: account.accountType, user: account.displayName });

    const conversation = await loadConversation(phoneNumber);
    log(phoneNumber, 'conversation', {
      workspace_chosen: conversation.workspace_chosen,
      active_project:   conversation.active_project_id ? 'set' : 'none',
      active_survey:    conversation.active_survey_id  ? 'set' : 'none',
    });

    // ── Workspace resolution ──────────────────────────────────────────────────

    // Handle any pending workspace or document selection ("1", "2", etc.)
    if (conversation.pending_clarification?.type === 'document_list' ||
        conversation.pending_clarification?.type === 'workspace_choice') {
      const pendingType = conversation.pending_clarification.type;
      const clarResult  = await resolveClarification(phoneNumber, content, conversation);

      if (clarResult.resolved) {
        const isPersonal   = clarResult.chosenOption.id === '__personal__';
        const collectiveId = isPersonal ? null : clarResult.chosenOption.id;
        await saveConversation(phoneNumber, {
          active_collective_id: collectiveId,
          workspace_chosen:     true,
          active_project_id:    null,
          active_survey_id:     null,
        });
        account.collectiveId              = collectiveId;
        conversation.workspace_chosen     = true;
        conversation.active_collective_id = collectiveId;
        conversation.pending_clarification = null;
        log(phoneNumber, 'workspace-chosen', { collective: collectiveId ?? 'personal', via: pendingType });

        const originalContent = clarResult.originalPayload?.originalContent;
        if (originalContent) {
          content = originalContent;
        } else {
          await sendReply(appUrl, secret, phoneNumber, '✓ Rendben, dolgozzunk tovább!');
          await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'workspace_chosen' });
          return;
        }
      } else if (clarResult.cancel) {
        await sendReply(appUrl, secret, phoneNumber, 'Rendben, megszakítva.');
        await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'cancelled' });
        return;
      } else {
        const pc   = conversation.pending_clarification;
        const opts = (pc?.options || []).map((o, i) => `${i + 1}. ${o.name}`).join('\n');
        await sendReply(appUrl, secret, phoneNumber,
          pendingType === 'document_list'
            ? `Kérlek válassz egy dokumentumot:\n\n${opts}\n\nVálaszolj egy számmal, vagy írd: mégse`
            : `Melyik fiókban dolgozol?\n\n${opts}\n\nVálaszolj egy számmal.`);
        await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'workspace_re_ask' });
        return;
      }

    } else {
      const wsResult = await resolveWorkspace(account, conversation, phoneNumber, content);
      log(phoneNumber, 'workspace', {
        needsClarification: wsResult.needsClarification,
        type: wsResult.clarificationType ?? 'resolved',
        collectiveId: wsResult.collectiveId ?? 'personal',
      });

      if (wsResult.needsClarification) {
        if (wsResult.clarificationType === 'document_list') {
          const opts = wsResult.options.map((o, i) => `${i + 1}. ${o.name}`).join('\n');
          await sendReply(appUrl, secret, phoneNumber,
            `Találtam néhány dokumentumot, ami illeszkedik a kéréséhez:\n\n${opts}\n\nKérlek válassz egyet, vagy írd: mégse`);
        } else {
          const opts = wsResult.clarificationOptions.map((o, i) => `${i + 1}. ${o.name}`).join('\n');
          await sendReply(appUrl, secret, phoneNumber,
            `Melyik fiókban dolgozol most?\n\n${opts}\n\nVálaszolj egy számmal, vagy írd: mégse`);
        }
        await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'workspace_clarification' });
        return;
      }

      if (conversation.workspace_chosen) {
        account.collectiveId = conversation.active_collective_id;
      }
    }

    // ── Captionless media pre-flight ─────────────────────────────────────────
    // If an image/video arrives with no caption AND we have a fresh working context,
    // attach it directly without an LLM call.

    if (mediaUrl && !content && contentType !== 'voice' && contentType !== 'audio'
        && conversation.current_document_id && conversation.current_document_type === 'survey') {

      const ageMin = contextAgeMinutes(conversation);
      const docName  = conversation.current_document_name || 'felmérés';
      const areaName = conversation.current_area;

      if (ageMin <= 240) {
        // Context is fresh enough — attach directly
        const toolExecutors = buildToolExecutors({ account, conversation, phoneNumber, mediaUrl, mediaKey, contentType, appUrl, secret });
        const result = await toolExecutors.attach_media({
          target:    'survey',
          target_id: conversation.current_document_id,
          room_name: areaName || null,
        });

        let reply;
        if (result.success) {
          const staleLine = ageMin > 60 ? `\n📍 Kontextus: ${docName}${areaName ? ` / ${areaName}` : ''} (${Math.round(ageMin)} perce)` : '';
          reply = `📋 Felmérés: "${docName}"\n${areaName ? `🏠 Helyiség: ${areaName}\n` : ''}🖼️ Fotó csatolva ✅${staleLine}`;
        } else {
          reply = `📋 Felmérés: "${docName}"\n❌ ${result.error}`;
        }

        log(phoneNumber, 'preflight-attach', { doc: docName, area: areaName, ageMin: Math.round(ageMin) });
        await sendReply(appUrl, secret, phoneNumber, reply);
        await appendToContextWindow(phoneNumber, 'user', `(${contentType})`);
        await appendToContextWindow(phoneNumber, 'assistant', reply);
        await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'preflight_attach' });
        return;

      } else {
        // Context is stale (>4h) — ask once, let LLM handle
        log(phoneNumber, 'preflight-stale', { ageMin: Math.round(ageMin) });
        // Fall through to agent with injected stale-context prompt
        content = `[rendszer: az előző kontextus (${docName}${areaName ? ` / ${areaName}` : ''}) több mint 4 órás. Kérdezd meg a felhasználót: még mindig itt dolgozik, vagy más helyre kell csatolni a képet?]`;
      }
    }

    // ── Voice transcription ───────────────────────────────────────────────────

    let transcript = null;
    if ((contentType === 'voice' || contentType === 'audio') && mediaUrl) {
      try {
        const tx = await transcribeVoiceNote(mediaUrl, phoneNumber, account.userId, mediaKey, waMsg?.id);
        transcript = tx.transcript;
        content    = transcript;
        if (waMsg?.id) await admin.from('wa_messages').update({ transcript }).eq('id', waMsg.id);
      } catch (err) {
        console.error('[wa/process] Whisper error:', err.message);
        await sendReply(appUrl, secret, phoneNumber, 'Sajnos nem sikerült átírni a hangüzenetet. Kérlek írj szöveget.');
        await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'whisper_failed' });
        return;
      }
    }

    // ── Agent turn ────────────────────────────────────────────────────────────

    // Build rich system prompt with full workspace context
    const agentCtx = await buildAgentContext(account, conversation);
    log(phoneNumber, 'agent-context', {
      surveys: agentCtx.surveys.length,
      projects: agentCtx.projects.length,
      workspaces: agentCtx.workspaces?.length ?? 1,
      activeSurvey: agentCtx.activeSurvey?.title ?? 'none',
    });

    // Build tool executors bound to this turn's context
    const toolExecutors = buildToolExecutors({ account, conversation, phoneNumber, mediaUrl, mediaKey, contentType, appUrl, secret });

    // Compose user message — include media signal if present
    let userMessage = content || `(${contentType})`;
    if (mediaUrl && contentType !== 'voice' && contentType !== 'audio') {
      userMessage = `${userMessage || '(médiaüzenet)'}`.trim()
        + `\n\n[Média csatolva — típus: ${contentType}, URL: ${mediaUrl}]`;
    }
    if (transcript) {
      userMessage = transcript;
    }

    // Recent conversation history (last 10 turns)
    const historyMessages = (conversation.context_window || []).slice(-10);

    log(phoneNumber, 'agent-run', { historyLen: historyMessages.length });

    const agentMediaType = contentType === 'image'    ? 'image/jpeg'
                         : contentType === 'video'    ? 'video/mp4'
                         : contentType === 'document' ? 'application/pdf'
                         : contentType === 'voice'    ? 'audio/ogg'
                         : 'text';

    const { reply } = await runAgentTurn({
      systemPrompt:        agentCtx.systemPrompt,
      conversationHistory: historyMessages,
      userMessage,
      tools:               TOOL_DEFS,
      toolExecutors,
      phoneNumber,
      userId:              account.userId,
      waMessageId:         waMsg?.id || null,
      mediaType:           agentMediaType,
    });

    log(phoneNumber, 'agent-reply', { preview: reply?.slice(0, 80) });

    // Voice: append a truncated transcript as the last line so the structured action stays on top
    const finalReply = transcript
      ? `${reply}\n🎤 _"${transcript.slice(0, 120)}${transcript.length > 120 ? '…' : ''}"_`
      : reply;
    await sendReply(appUrl, secret, phoneNumber, finalReply);

    await appendToContextWindow(phoneNumber, 'user',      content || `(${contentType})`);
    await appendToContextWindow(phoneNumber, 'assistant', reply);

    await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'agent' });

  } catch (err) {
    log(phoneNumber, 'ERROR', { message: err.message, stack: err.stack?.split('\n')[1]?.trim() });

    const attempts = (item.attempts || 0) + 1;
    if (attempts >= 3) {
      await admin.from('wa_processing_queue').update({
        status: 'failed', attempts, last_error: err.message, processed_at: new Date().toISOString(),
      }).eq('id', item.id);
    } else {
      await admin.from('wa_processing_queue').update({
        status: 'pending', attempts, last_error: err.message, locked_until: null,
      }).eq('id', item.id);
    }

    if (waMsg?.id) {
      await admin.from('wa_messages').update({
        error_code:             'PROCESSING_ERROR',
        error_details:          { message: err.message, attempts },
        processing_finished_at: new Date().toISOString(),
      }).eq('id', waMsg.id);
    }
  }
}

async function finalise(admin, queueId, waMsgId, startedAt, updates = {}) {
  await admin.from('wa_processing_queue').update({
    status: 'done', message_id: waMsgId, processed_at: new Date().toISOString(),
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

  // Group by phone so multiple messages from the same sender run serially
  // (preserves conversation state ordering). Different phones still run in parallel.
  const byPhone = {};
  for (const item of items) {
    try {
      const p = JSON.parse(item.payload);
      const info = p.event?.Info;
      const jid  = info?.Chat || info?.Sender || '';
      const phoneJid = (jid.endsWith('@lid') && info?.SenderAlt) ? info.SenderAlt : jid;
      const phone = jidToE164(phoneJid) || item.id;
      if (!byPhone[phone]) byPhone[phone] = [];
      byPhone[phone].push(item);
    } catch {
      await processItem(item, admin, appUrl, secret);
    }
  }

  await Promise.all(
    Object.values(byPhone).map(async phoneItems => {
      for (const item of phoneItems) {
        await processItem(item, admin, appUrl, secret);
      }
    })
  );

  return Response.json({ processed: items.length });
}

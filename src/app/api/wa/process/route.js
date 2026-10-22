import { createAdminClient } from '@/lib/supabase/admin';
import { resolveAccount, UNREGISTERED_REPLY } from '@/lib/waAssistant/resolveAccount';
import { toJid, jidToE164 } from '@/lib/waAssistant/jid';
import { loadConversation, saveConversation, appendToContextWindow } from '@/lib/waAssistant/conversation';
import { resolveClarification, saveClarification, formatClarificationMessage } from '@/lib/waAssistant/clarification';
import { resolveProject } from '@/lib/waAssistant/resolveProject';
import { resolveWorkspace } from '@/lib/waAssistant/resolveWorkspace';
import { revertLastAction } from '@/lib/waAssistant/actions/revert';
import { buildUserContext } from '@/lib/waAssistant/buildUserContext';
import { resolveIntent } from '@/lib/waAssistant/resolveIntent';
import { createSurvey } from '@/lib/waAssistant/actions/createSurvey';
import { addSurveyEntry } from '@/lib/waAssistant/actions/addSurveyEntry';
import { listSurveys } from '@/lib/waAssistant/actions/listSurveys';
import { createLabourEntry, createLabourEntryWithRate } from '@/lib/waAssistant/actions/createLabourEntry';
import { queryProjectCosts } from '@/lib/waAssistant/actions/queryProjectCosts';
import { listProjects } from '@/lib/waAssistant/actions/listProjects';
import { querySurveyNotes } from '@/lib/waAssistant/actions/querySurveyNotes';
import { attachMedia } from '@/lib/waAssistant/actions/attachMedia';
import { createInvoice, confirmInvoice } from '@/lib/waAssistant/actions/createInvoice';
import { transcribeVoiceNote } from '@/lib/waAssistant/transcribe';

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
  const COMING_SOON = 'Ez a funkció hamarosan elérhető.';
  const ctx = { waAccount: account, conversation, extracted, phoneNumber, content, mediaUrl, contentType };

  switch (intent) {
    case 'greeting': {
      const hint = conversation.active_project_id ? '' : '\n\nNincs aktív projekted. Írd: *projektek listája*';
      return { reply: `Szia ${account.displayName}! Miben segíthetek?${hint}`, action: 'greeting' };
    }

    case 'set_active_project': {
      const result = await resolveProject(content, account, conversation);
      if (result.needsClarification) {
        await saveClarification(phoneNumber, 'project_choice', result.clarificationOptions, 'set_active_project', {});
        const reply = formatClarificationMessage('Melyik projektet választod?', result.clarificationOptions);
        return { reply, action: 'clarification_sent' };
      }
      await saveConversation(phoneNumber, { active_project_id: result.projectId, active_survey_id: null });
      return { reply: `✓ Aktív projekt: *${result.projectName}*`, action: 'set_active_project' };
    }

    case 'create_survey': {
      const result = await createSurvey(ctx);
      if (result.needsClarification) {
        await saveClarification(phoneNumber, result.clarificationType, result.clarificationOptions, result.originalIntent, result.originalPayload);
        const reply = formatClarificationMessage('Melyik projekthez szeretnéd a felmérést?', result.clarificationOptions);
        return { reply, action: 'clarification_sent' };
      }
      return { reply: result.reply, action: 'create_survey' };
    }

    case 'add_survey_entry': {
      const result = await addSurveyEntry(ctx);
      return { reply: result.reply, action: 'add_survey_entry' };
    }

    case 'list_surveys': {
      const result = await listSurveys(ctx);
      return { reply: result.reply, action: 'list_surveys' };
    }

    case 'create_labour_entry': {
      const result = await createLabourEntry(ctx);
      if (result.needsClarification) {
        await saveClarification(phoneNumber, result.clarificationType, result.clarificationOptions, result.originalIntent, result.originalPayload);
        const reply = formatClarificationMessage('Melyik projekthez rögzítsem?', result.clarificationOptions);
        return { reply, action: 'clarification_sent' };
      }
      return { reply: result.reply, action: 'create_labour_entry' };
    }

    case 'query_costs': {
      const result = await queryProjectCosts(ctx);
      if (result.needsClarification) {
        await saveClarification(phoneNumber, result.clarificationType, result.clarificationOptions, result.originalIntent, result.originalPayload);
        const reply = formatClarificationMessage('Melyik projekt költségeit mutassam?', result.clarificationOptions);
        return { reply, action: 'clarification_sent' };
      }
      return { reply: result.reply, action: 'query_costs' };
    }

    case 'list_projects': {
      const result = await listProjects(ctx);
      return { reply: result.reply, action: 'list_projects' };
    }

    case 'create_invoice': {
      const result = await createInvoice({ ...ctx, extractedFromIntent: extracted });
      if (result.needsClarification) {
        await saveClarification(phoneNumber, result.clarificationType, result.clarificationOptions, result.originalIntent, result.originalPayload);
        const reply = formatClarificationMessage('Melyik projekthez rögzítsem?', result.clarificationOptions);
        return { reply, action: 'clarification_sent' };
      }
      return { reply: result.reply, action: 'create_invoice' };
    }

    case 'attach_media': {
      const result = await attachMedia({ ...ctx, mimeType: contentType === 'image' ? 'image/jpeg' : contentType === 'video' ? 'video/mp4' : 'application/octet-stream', caption: content });
      if (result.handoffToInvoice) {
        const inv = await createInvoice({ ...ctx, imgBuf: result.imgBuf, mimeType: result.mimeType, extractedFromIntent: {} });
        return { reply: inv.reply, action: 'create_invoice' };
      }
      return { reply: result.reply, action: 'attach_media' };
    }

    case 'query_survey': {
      const result = await querySurveyNotes(ctx);
      return { reply: result.reply, action: 'query_survey' };
    }

    case 'create_client': {
      // WA-051: only collective owners can create clients; members cannot
      if (account.accountType === 'owner_member' && account.collectiveId) {
        const { data: membership } = await admin
          .from('collective_members')
          .select('role')
          .eq('collective_id', account.collectiveId)
          .eq('user_id', account.userId)
          .maybeSingle();
        if (membership?.role !== 'owner') {
          return { reply: 'Ügyfél létrehozáshoz kérjük használd az OkosSzaki alkalmazást.', action: 'permission_denied' };
        }
      }
      if (account.accountType === 'subbie') {
        return { reply: 'Ügyfél létrehozáshoz kérjük használd az OkosSzaki alkalmazást.', action: 'permission_denied' };
      }
      return { reply: COMING_SOON, action: 'not_implemented' };
    }

    case 'set_active_survey':
      return { reply: COMING_SOON, action: 'not_implemented' };

    default:
      return { reply: 'Miben segíthetek? Próbálj valami ilyesmit:\n– _új felmérés_\n– _projektek listája_\n– _8 óra burkolás_\n– _45000 Ft csempe_', action: 'unknown' };
  }
}

function log(phone, step, data = {}) {
  const tag = `[wa ${phone?.slice(-4) ?? '????'}]`;
  const extra = Object.keys(data).length ? ' ' + JSON.stringify(data) : '';
  console.log(`${tag} ${step}${extra}`);
}

async function processItem(item, admin, appUrl, secret) {
  const startedAt = new Date().toISOString();
  let waMessageId, phoneNumber, contentType, content, mediaUrl;

  try {
    ({ waMessageId, phoneNumber, contentType, content, mediaUrl } = parsePayload(item.payload));
  } catch (err) {
    console.error('[wa process] payload parse error:', err.message);
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

  log(phoneNumber, 'inbound', { type: contentType, preview: (content || '').slice(0, 60) });

  try {
    // Revert command — undo last write action within 120 minutes
    if (content && ['vissza', 'revert', 'undo', 'visszavon'].includes(content.trim().toLowerCase())) {
      const conversation = await loadConversation(phoneNumber);
      const account = await resolveAccount(phoneNumber);
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

    // "reset" command — clear all stuck conversation state
    if (content && ['reset', 'újra', 'restart', 'újraindítás', 'törlés'].includes(content.trim().toLowerCase())) {
      const account = await resolveAccount(phoneNumber);
      const admin2  = createAdminClient();
      await admin2.from('wa_conversations').update({
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
      const mode = account?.permissions?.mode;
      await sendReply(appUrl, secret, phoneNumber,
        `✓ Állapot törölve — friss lappal indulunk.\n${mode ? `_(${mode === 'guided' ? 'Vezérelt' : 'Szabad'} mód megmaradt)_` : ''}`);
      await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'reset' });
      return;
    }

    // Stop words — exit any active flow gracefully
    const STOP_WORDS = ['ennyi', 'kész', 'elég', 'stop', 'vége', 'done', 'enough', 'befejeztem',
      'befejezve', 'köszönöm', 'thats it', "that's it", 'no more', 'finish', 'cancel', 'restart',
      'újra', 'ok', 'oké', 'okay', 'rendben', 'jó', 'jo', 'fine', 'exit', 'quit', 'kilép'];
    const normalizedContent = (content || '').trim().toLowerCase().replace(/[.,!?]+$/, '');
    if (content && STOP_WORDS.includes(normalizedContent)) {
      const account  = await resolveAccount(phoneNumber);
      const conv     = await loadConversation(phoneNumber);
      // Clear any pending clarification so the bot isn't stuck
      if (conv.pending_clarification) {
        await saveConversation(phoneNumber, { pending_clarification: null });
      }
      let reply = 'Rendben! Miben segíthetek?';
      if (conv.active_survey_id) {
        reply = 'Rendben! A felmérés el van mentve. Miben segíthetek?';
      }
      log(phoneNumber, 'stop-word');
      await sendReply(appUrl, secret, phoneNumber, reply);
      await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'stop' });
      return;
    }

    // "mód" command — change interaction mode at any time
    if (content && ['mód', 'mod', 'mode', 'vezérelt', 'szabad'].includes(content.trim().toLowerCase())) {
      const account = await resolveAccount(phoneNumber);
      if (account) {
        const modeOptions = [
          { id: 'guided', name: 'Vezérelt mód — lépésről lépésre segítelek' },
          { id: 'free',   name: 'Szabad mód — csak megerősítlek' },
        ];
        await saveClarification(phoneNumber, 'mode_choice', modeOptions, null, null);
        await sendReply(appUrl, secret, phoneNumber,
          'Hogyan szeretnél dolgozni?\n\n1. Vezérelt mód — lépésről lépésre segítelek\n2. Szabad mód — csak megerősítlek, a többit te irányítod');
        await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'mode_prompt' });
        return;
      }
    }

    // VERIFY command — handled before account check (unverified numbers need this)
    if (content && content.trim().toUpperCase().startsWith('VERIFY ')) {
      await handleVerify(admin, phoneNumber, content, appUrl, secret);
      await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'verify' });
      return;
    }

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
      pending_clarif:   conversation.pending_clarification?.type || 'none',
    });

    // Check for a pending clarification first
    let dispatchIntent = null;
    let dispatchExtracted = {};

    if (conversation.pending_clarification) {
      const clarResult = await resolveClarification(phoneNumber, content, conversation);

      if (clarResult.resolved) {
        // Chosen option resolved — apply it based on clarification type
        const type = conversation.pending_clarification?.type;

        if (type === 'workspace_choice') {
          const isPersonal = clarResult.chosenOption.id === '__personal__';
          const collectiveId = isPersonal ? null : clarResult.chosenOption.id;
          await saveConversation(phoneNumber, {
            active_collective_id: collectiveId,
            workspace_chosen:     true,
            active_project_id:    null,
            active_survey_id:     null,
          });
          account.collectiveId = collectiveId;
          // Update stale local conversation so resolveWorkspace sees the new state
          conversation.workspace_chosen     = true;
          conversation.active_collective_id = collectiveId;
          log(phoneNumber, 'workspace-chosen', { collective: collectiveId ?? 'personal' });

          const originalContent = clarResult.originalPayload?.originalContent;
          if (originalContent) {
            content = originalContent;
            // dispatchIntent stays null → goes through intent classification
          } else {
            const label = isPersonal ? 'Személyes munkaterület' : `*${clarResult.chosenOption.name}*`;
            await sendReply(appUrl, secret, phoneNumber, `✓ Aktív munkaterület: ${label}`);
            await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'workspace_chosen' });
            return;
          }
        }

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

        if (type === 'mode_choice') {
          // Legacy global mode — keep for 'mód' command
          const mode = clarResult.chosenOption.id;
          const currentPerms = account.permissions || {};
          await admin.from('wa_accounts').update({ permissions: { ...currentPerms, mode } }).eq('phone_number', phoneNumber);
          account.permissions = { ...currentPerms, mode };
          await saveConversation(phoneNumber, { session_mode: mode });
          log(phoneNumber, 'mode-set', { mode });
          const originalContent = clarResult.originalPayload?.originalContent;
          if (originalContent) {
            content = originalContent;
          } else {
            await sendReply(appUrl, secret, phoneNumber, `✓ ${mode === 'guided' ? 'Vezérelt' : 'Szabad'} mód beállítva.`);
            await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'mode_set' });
            return;
          }
        } else if (type === 'doc_mode_choice') {
          // Per-document mode choice — stores in session_mode
          const mode = clarResult.chosenOption.id; // 'guided' | 'free'
          await saveConversation(phoneNumber, { session_mode: mode });
          log(phoneNumber, 'doc-mode', { mode });

          if (mode === 'guided') {
            await saveClarification(phoneNumber, 'guided_next_step', [
              { id: 'rooms',  name: 'Helyiségek és méretek' },
              { id: 'media',  name: 'Fotó / alaprajz feltöltése' },
              { id: 'client', name: 'Ügyfél hozzárendelése' },
              { id: 'done',   name: 'Kész így' },
            ], null, clarResult.originalPayload);
            await sendReply(appUrl, secret, phoneNumber,
              'Vezérelt módot választottál! Mivel kezdjük?\n\n1. Helyiségek és méretek\n2. Fotó / alaprajz feltöltése\n3. Ügyfél hozzárendelése\n4. Kész így');
          } else {
            await sendReply(appUrl, secret, phoneNumber,
              'Rendben — szabad mód! Adj hozzá helyiségeket, fotókat, ügyfelet bármikor. Írd: _ennyi_ ha kész vagy.');
          }
          await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'doc_mode_set' });
          return;
        } else if (type === 'guided_next_step') {
          const choice = clarResult.chosenOption.id;
          if (choice === 'rooms') {
            await sendReply(appUrl, secret, phoneNumber,
              'Mondj helyiségeket és méreteket! Pl: _Konyha, 3,5 × 4,2 m_');
          } else if (choice === 'media') {
            await sendReply(appUrl, secret, phoneNumber,
              'Küld el a fotót vagy alaprajzot! Csatolom a felméréshez.');
          } else if (choice === 'client') {
            await sendReply(appUrl, secret, phoneNumber,
              'Ügyfél hozzárendelése hamarosan elérhető. Addig folytasd a helyiségekkel!');
          } else {
            await sendReply(appUrl, secret, phoneNumber,
              'Rendben! Folytasd bármikor — várom a helyiségeket, fotókat vagy egyéb bejegyzéseket.');
          }
          await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'guided_next_step' });
          return;
        } else if (type === 'room_details_needed') {
          // Parse "1 ajtó, 2 ablak" or "kihagyom"
          const norm = (content || '').trim().toLowerCase();
          if (!['kihagyom', 'skip', 'nem', '-', 'ennyi', 'kész'].includes(norm)) {
            const doorMatch   = norm.match(/(\d+)\s*ajtó/);
            const windowMatch = norm.match(/(\d+)\s*ablak/);
            const doors   = doorMatch   ? parseInt(doorMatch[1])   : null;
            const windows = windowMatch ? parseInt(windowMatch[1]) : null;
            if (doors !== null || windows !== null) {
              const entryId = clarResult.originalPayload?.entryId;
              if (entryId) {
                const updates = {};
                if (doors   !== null) updates.door_count   = doors;
                if (windows !== null) updates.window_count = windows;
                await admin.from('survey_entries').update(updates).eq('id', entryId);
                const parts = [doors !== null ? `${doors} ajtó` : null, windows !== null ? `${windows} ablak` : null].filter(Boolean);
                await sendReply(appUrl, secret, phoneNumber, `✓ Rögzítve: ${parts.join(', ')}\n\nKövetkező helyiség?`);
              } else {
                await sendReply(appUrl, secret, phoneNumber, 'Következő helyiség?');
              }
            } else {
              await sendReply(appUrl, secret, phoneNumber, 'Következő helyiség?');
            }
          } else {
            await sendReply(appUrl, secret, phoneNumber, 'Rendben! Következő helyiség?');
          }
          await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'room_details' });
          return;
        } else if (type === 'survey_title_needed') {
          dispatchIntent    = 'create_survey';
          dispatchExtracted = { ...(clarResult.originalPayload || {}), surveyTitle: content?.trim() };
        } else if (type === 'labour_rate_needed') {
          const result = await createLabourEntryWithRate({
            waAccount:      account,
            conversation,
            phoneNumber,
            rateText:       content,
            pendingPayload: clarResult.originalPayload || {},
          });
          await sendReply(appUrl, secret, phoneNumber, result.reply);
          await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'create_labour_entry' });
          return;
        } else if (type === 'invoice_amount_needed') {
          const parsed = parseInt((content || '').replace(/\D/g, ''), 10);
          if (!isNaN(parsed) && parsed > 0) {
            const payload = { ...(clarResult.originalPayload || {}), amountHuf: parsed };
            const result  = await createInvoice({ waAccount: account, conversation, mediaUrl: null, mimeType: null, extractedFromIntent: payload, phoneNumber });
            await sendReply(appUrl, secret, phoneNumber, result.reply);
            await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'create_invoice' });
          } else {
            await sendReply(appUrl, secret, phoneNumber, 'Kérlek adj meg egy összeget számban (pl. 45000).');
            await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'invalid_clarification' });
          }
          return;
        } else if (type === 'invoice_confirm') {
          const result = await confirmInvoice({ waAccount: account, conversation, phoneNumber, content, pendingPayload: clarResult.originalPayload || {} });
          await sendReply(appUrl, secret, phoneNumber, result.reply);
          await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'create_invoice' });
          return;
        } else {
          dispatchIntent    = clarResult.originalIntent;
          dispatchExtracted = clarResult.originalPayload || {};
        }
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

    // Build user context package — used by intent classifier and workspace resolver
    const userCtx = !dispatchIntent
      ? await buildUserContext(account, conversation).catch((e) => { log(phoneNumber, 'context-build-error', { err: e.message }); return null; })
      : null;
    log(phoneNumber, 'user-context', { built: !!userCtx });

    // Workspace check — try to resolve from message first, then ask if still ambiguous
    if (!dispatchIntent) {
      const wsResult = await resolveWorkspace(account, conversation, phoneNumber, content);
      log(phoneNumber, 'workspace', { needsClarification: wsResult.needsClarification, collectiveId: wsResult.collectiveId ?? 'personal' });
      if (wsResult.needsClarification) {
        const reply = formatClarificationMessage(
          'Melyik munkaterületen dolgozol most?',
          wsResult.clarificationOptions
        );
        await sendReply(appUrl, secret, phoneNumber, reply);
        await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'workspace_clarification' });
        return;
      }
      // Patch account's collectiveId for this turn if session overrides wa_account default
      if (conversation.workspace_chosen) {
        account.collectiveId = conversation.active_collective_id;
      }
    }

    // Voice note → Whisper transcription (WA-023)
    let transcript = null;
    if (!dispatchIntent && (contentType === 'voice' || contentType === 'audio') && mediaUrl) {
      try {
        const tx = await transcribeVoiceNote(mediaUrl, phoneNumber, account.userId);
        transcript = tx.transcript;
        content    = transcript; // use transcript as the text for intent classification
        if (waMsg?.id) {
          await admin.from('wa_messages').update({ transcript, r2_key: tx.r2Key }).eq('id', waMsg.id);
        }
      } catch (err) {
        console.error('[wa/process] Whisper error:', err.message);
        await sendReply(appUrl, secret, phoneNumber, 'Sajnos nem sikerült átírni a hangüzenetet. Kérlek írj szöveget.');
        await finalise(admin, item.id, waMsg?.id, startedAt, { action_taken: 'whisper_failed', error_code: 'WHISPER_FAILED' });
        return;
      }
    }

    // Classify intent if not already set from clarification resolution
    let intentResult;
    if (dispatchIntent) {
      intentResult = { intent: dispatchIntent, confidence: 1, extracted: dispatchExtracted };
    } else {
      intentResult = await resolveIntent({
        messageText:  content,
        contentType,
        contextWindow: conversation.context_window || [],
        userContext:  userCtx?.contextString || null,
        phoneNumber,
        userId:       account.userId,
      });
    }

    const { intent, confidence, extracted } = intentResult;
    log(phoneNumber, 'intent', { intent, confidence, extracted: JSON.stringify(extracted).slice(0, 120) });

    // Low confidence → treat as unknown
    const effectiveIntent = confidence < 0.6 ? 'unknown' : intent;
    if (effectiveIntent !== intent) log(phoneNumber, 'intent-downgraded', { from: intent, confidence, threshold: 0.6 });

    log(phoneNumber, 'dispatch', { intent: effectiveIntent });
    const { reply, action } = await dispatch(
      effectiveIntent, extracted, account, conversation,
      phoneNumber, content, mediaUrl, contentType, admin, appUrl, secret
    );

    log(phoneNumber, 'action', { action, reply: reply?.slice(0, 80) });
    const finalReply = transcript ? `🎤 _"${transcript}"_\n\n${reply}` : reply;
    await sendReply(appUrl, secret, phoneNumber, finalReply);
    await appendToContextWindow(phoneNumber, 'user', content || `(${contentType})`);
    await appendToContextWindow(phoneNumber, 'assistant', reply);

    await finalise(admin, item.id, waMsg?.id, startedAt, {
      intent,
      intent_confidence: confidence,
      extracted_data:    extracted,
      action_taken:      action,
    });
  } catch (err) {
    log(phoneNumber, 'ERROR', { message: err.message, stack: err.stack?.split('\n')[1]?.trim() });

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

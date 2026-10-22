import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { formatHUF } from '@/lib/constants';
import { uploadToR2, r2PublicUrl, toWebp } from '@/lib/r2';
import { saveClarification } from '../clarification';
import { saveLastAction } from '../conversation';
import { resolveProject } from '../resolveProject';
import { logOpenAiUsage, resolveModel } from '../logAiUsage';

async function extractInvoiceFromImage(imgBuffer, mimeType, { phoneNumber, userId } = {}) {
  const apiKey = process.env.OPEN_AI_OCR_KEY;
  const model  = await resolveModel('invoice_ocr').catch(() => 'gpt-4o');
  const base64     = imgBuffer.toString('base64');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        {
          role:    'system',
          content: `Te számlaolvasó vagy. A képen látható számla végösszegét, leírását és kategóriáját add vissza.
Kategóriák: Anyag (csempe, festék, cement, fa, anyag), Szállítás (fuvar, szállítás), Szerszám/Eszköz (szerszám, eszköz, állványzat), Engedély/Hatóság (engedély, hatóság, díj, illeték), Egyéb.
Ha nem olvasható el a végösszeg, add vissza null-t.`,
        },
        {
          role:    'user',
          content: [
            { type: 'text', text: 'Mi a számla végösszege, rövid leírása, és kategóriája?' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name:   'invoice_extract',
          strict: true,
          schema: {
            type:       'object',
            properties: {
              amountHuf:   { type: ['number', 'null'] },
              description: { type: 'string' },
              category:    { type: 'string', enum: ['Anyag', 'Szerszám/Eszköz', 'Szállítás', 'Engedély/Hatóság', 'Egyéb'] },
            },
            required:             ['amountHuf', 'description', 'category'],
            additionalProperties: false,
          },
        },
      },
      max_completion_tokens:  300,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const raw  = data.choices?.[0]?.message?.content;
  if (!raw) return null;
  if (data.usage && phoneNumber) {
    logOpenAiUsage({ phoneNumber, userId, model: 'gpt-4o', callType: 'invoice_ocr', usage: data.usage })
      .catch(() => {});
  }
  return JSON.parse(raw);
}

export async function createInvoice({ waAccount, conversation, mediaUrl, mimeType, extractedFromIntent, phoneNumber, imgBuf }) {
  // WA-062: Subbie permission check
  if (waAccount.accountType === 'subbie' && !waAccount.permissions?.can_upload_invoices) {
    return { reply: 'Nincs számla feltöltési jogosultságod. Kérd meg a mestert a hozzáférés megadásához.' };
  }

  const projectResult = await resolveProject(extractedFromIntent?.project_hint || '', waAccount, conversation);

  if (projectResult.needsClarification) {
    return {
      reply: null,
      needsClarification: true,
      clarificationType:    'project_choice',
      clarificationOptions: projectResult.clarificationOptions,
      originalIntent:       'create_invoice',
      originalPayload:      extractedFromIntent,
    };
  }

  const { projectId, projectName } = projectResult;
  const admin = createAdminClient();
  let amountHuf   = extractedFromIntent?.amountHuf ?? null;
  let description = extractedFromIntent?.description || null;
  let category    = extractedFromIntent?.category || 'Egyéb';
  let r2Key       = null;

  // Process image if provided
  if (mediaUrl || imgBuf) {
    try {
      const buf = imgBuf || Buffer.from(await (await fetch(mediaUrl)).arrayBuffer());
      const webp = await toWebp(buf);
      r2Key = `wa/${phoneNumber.replace(/\+/g, '')}/${Date.now()}.webp`;
      await uploadToR2(r2Key, webp, 'image/webp');

      const extracted = await extractInvoiceFromImage(buf, mimeType || 'image/jpeg', { phoneNumber, userId: waAccount.userId });
      if (extracted?.amountHuf) amountHuf   = extracted.amountHuf;
      if (extracted?.description) description = extracted.description;
      if (extracted?.category) category      = extracted.category;
    } catch (err) {
      console.error('[wa createInvoice] image processing error:', err.message);
    }
  }

  // If amount still unknown, ask
  if (!amountHuf) {
    await saveClarification(phoneNumber, 'invoice_amount_needed', [], 'create_invoice', { projectId, r2Key, description, category });
    return { reply: 'Nem sikerült kiolvasni az összeget. Mennyi a számla végösszege (Ft-ban)?' };
  }

  // Ask for confirmation before saving
  const preview = `Számla felismerve:\n💰 *${formatHUF(amountHuf)}* (${category})${description ? `\n_${description}_` : ''}\n\nHelyes? Válaszolj *igen* vagy add meg a helyes összeget.`;
  await saveClarification(phoneNumber, 'invoice_confirm', [], 'create_invoice', {
    projectId, projectName, amountHuf, description, category, r2Key,
  });

  return { reply: preview };
}

export async function confirmInvoice({ waAccount, conversation, phoneNumber, content, pendingPayload }) {
  const { projectId, projectName, description, category, r2Key } = pendingPayload;
  const admin = createAdminClient();

  const norm = content?.trim().toLowerCase();
  let amountHuf = pendingPayload.amountHuf;

  if (['mégse', 'megse', 'nem'].includes(norm)) {
    return { reply: 'Rendben, a számla nem lett rögzítve.' };
  }

  if (!['igen', 'ok', 'rendben', 'jó', 'jo'].includes(norm)) {
    const parsed = parseInt(norm?.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) amountHuf = parsed;
  }

  const publicUrl = r2Key ? r2PublicUrl(r2Key) : null;

  const { data: entry, error } = await admin.from('invoices').insert({
    project_id:    projectId,
    uploaded_by:   waAccount.userId || null,
    uploader_name: waAccount.displayName || null,
    value_huf:     amountHuf,
    category,
    description:   description || null,
    storage_path:  r2Key || null,
    image_url:     publicUrl,
  }).select('id').single();

  if (error) {
    console.error('[wa confirmInvoice] insert error:', error.message);
    return { reply: 'Sajnos nem sikerült rögzíteni a számlát. Kérlek próbáld újra.' };
  }

  await saveLastAction(phoneNumber, 'invoice', 'invoices', entry?.id);

  await logAudit({
    userId:     waAccount.userId,
    userName:   waAccount.displayName,
    action:     'Számla rögzítve (WhatsApp)',
    targetType: 'invoice',
    targetId:   entry?.id,
    targetName: projectName,
    details:    { channel: 'whatsapp', value_huf: amountHuf, category },
  });

  return { reply: `✓ Számla rögzítve: ${formatHUF(amountHuf)}, ${category} — ${projectName}\n\n_Visszavonáshoz: vissza_` };
}

import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { saveLastAction } from '../conversation';
import { saveClarification } from '../clarification';

const fmtN = n => (n != null ? String(n).replace('.', ',') : null);

export async function addSurveyEntry({ waAccount, conversation, extracted, phoneNumber }) {
  if (!conversation.active_survey_id) {
    return { reply: 'Nincs aktív felmérés. Írj "új felmérés" hogy egyet létrehozz, vagy add meg melyikhez szeretnéd hozzáadni.' };
  }

  const { name, widthM, lengthM, heightM, windowCount, doorCount } = extracted || {};

  if (!name) {
    return { reply: 'Melyik helyiség ez? (pl. konyha, fürdőszoba, nappali)' };
  }

  if (widthM == null || lengthM == null) {
    return { reply: `Add meg a(z) ${name} méreteit: szélesség × hossz (pl. 3,5 × 4,2 m)` };
  }

  const floorAreaM2 = Math.round(widthM * lengthM * 100) / 100;

  const admin = createAdminClient();

  const entryData = {
    survey_id:    conversation.active_survey_id,
    name:         name.trim(),
    width_m:      widthM,
    length_m:     lengthM,
    size_m2:      floorAreaM2,
    height_m:     heightM     ?? null,
    window_count: windowCount ?? 0,
    door_count:   doorCount   ?? 0,
  };

  const { data: entry, error } = await admin.from('survey_entries').insert({
    ...entryData,
    created_by:      waAccount.userId || null,
    created_by_name: waAccount.displayName || null,
  }).select('id').single();

  // Fallback if created_by columns don't exist yet
  if (error?.message?.includes('column') && error.message.includes('created_by')) {
    const { data: e2, error: e2err } = await admin.from('survey_entries').insert(entryData).select('id').single();
    if (e2err) {
      console.error('[wa addSurveyEntry] insert error:', e2err.message);
      return { reply: 'Sajnos nem sikerült rögzíteni a helyiséget. Kérlek próbáld újra.' };
    }
  } else if (error) {
    console.error('[wa addSurveyEntry] insert error:', error.message);
    return { reply: 'Sajnos nem sikerült rögzíteni a helyiséget. Kérlek próbáld újra.' };
  }

  await saveLastAction(phoneNumber, 'survey_entry', 'survey_entries', entry?.id);

  await logAudit({
    userId:     waAccount.userId,
    userName:   waAccount.displayName,
    action:     'Helyiség rögzítve (WhatsApp)',
    targetType: 'survey_entry',
    targetId:   entry?.id,
    targetName: name,
    details:    { channel: 'whatsapp', survey_id: conversation.active_survey_id, width_m: widthM, length_m: lengthM },
  });

  // Build confirmation — only include dimensions that were provided
  const parts = [`${fmtN(widthM)} × ${fmtN(lengthM)} m (${fmtN(floorAreaM2)} m²)`];
  if (heightM != null)   parts.push(`${fmtN(heightM)} m mennyezet`);
  if (doorCount > 0)     parts.push(`${doorCount} ajtó`);
  if (windowCount > 0)   parts.push(`${windowCount} ablak`);

  const confirmation = `✓ Rögzítve: *${name}* — ${parts.join(', ')}`;

  // Guided mode: ask for missing doors/windows
  const mode = conversation.session_mode || 'free';
  const missingDetails = (windowCount == null || windowCount === 0) && (doorCount == null || doorCount === 0);

  if (mode === 'guided' && missingDetails && entry?.id) {
    await saveClarification(phoneNumber, 'room_details_needed', [], null, { entryId: entry.id, roomName: name });
    return { reply: `${confirmation}\n\nHány ajtó és ablak van a(z) *${name}*ban/ben?\n(pl. _1 ajtó, 2 ablak_) — vagy írd: _kihagyom_` };
  }

  return { reply: `${confirmation}\n\nKövetkező helyiség? — vagy írd: _ennyi_\n_Visszavonáshoz: vissza_` };
}

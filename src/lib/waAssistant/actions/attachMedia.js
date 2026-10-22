import { uploadToR2, r2PublicUrl, toWebp } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';
import { classifyImage } from '../classifyImage';
import { saveClarification } from '../clarification';
import { decryptWhatsAppMedia } from '../decryptMedia';

const MAX_VIDEO_BYTES = 10 * 1024 * 1024; // 10 MB

async function fetchMedia(mediaUrl, mediaKey, mediaType) {
  // WhatsApp CDN URLs (mmg.whatsapp.net) deliver encrypted bytes — decrypt if mediaKey present
  if (mediaKey && mediaUrl?.includes('whatsapp.net')) {
    return decryptWhatsAppMedia(mediaUrl, mediaKey, mediaType);
  }
  const res = await fetch(mediaUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function attachMedia({ waAccount, conversation, mediaUrl, mediaKey, mimeType, caption, phoneNumber, entryId = null, forcedMediaType = null }) {
  if (!mediaUrl) return { reply: 'Nem sikerült letölteni a médiát. Kérlek próbáld újra.' };

  const isVideo    = mimeType?.startsWith('video/');
  const isImage    = mimeType?.startsWith('image/');
  const isDocument = mimeType === 'application/pdf' || mimeType?.startsWith('application/');

  // --- VIDEO ---
  if (isVideo) {
    let buf;
    try { buf = await fetchMedia(mediaUrl, mediaKey, 'video'); }
    catch (e) { return { reply: `Nem sikerült letölteni a videót: ${e.message}` }; }

    if (buf.length > MAX_VIDEO_BYTES) {
      return { reply: 'A videó túl nagy (max 10 MB). Kérlek rövidebb videót küldj.' };
    }

    const r2Key     = `wa/${phoneNumber.replace(/\+/g, '')}/${Date.now()}.mp4`;
    const publicUrl = r2PublicUrl(r2Key);
    await uploadToR2(r2Key, buf, 'video/mp4');
    return attachToRecord({ conversation, phoneNumber, waAccount, r2Key, publicUrl, mimeType: 'video/mp4', mediaType: 'video', fileName: 'video.mp4', entryId });
  }

  // --- IMAGE ---
  if (isImage) {
    let imgBuf;
    try { imgBuf = await fetchMedia(mediaUrl, mediaKey, 'image'); }
    catch (e) { return { reply: `Nem sikerült letölteni a képet: ${e.message}` }; }

    const { buffer: webpBuf } = await toWebp(imgBuf);
    const imageBase64 = imgBuf.toString('base64');
    const imageType   = await classifyImage(imageBase64, mimeType || 'image/jpeg', { phoneNumber, userId: waAccount.userId });

    if (imageType === 'invoice') {
      return { handoffToInvoice: true, imgBuf, mimeType };
    }

    const r2Key     = `wa/${phoneNumber.replace(/\+/g, '')}/${Date.now()}.webp`;
    const publicUrl = r2PublicUrl(r2Key);
    await uploadToR2(r2Key, webpBuf, 'image/webp');
    return attachToRecord({ conversation, phoneNumber, waAccount, r2Key, publicUrl, mimeType: 'image/webp', mediaType: forcedMediaType || 'photo', fileName: forcedMediaType === 'layout' ? 'alaprajz.webp' : 'photo.webp', entryId });
  }

  // --- PDF / document ---
  if (isDocument) {
    let buf;
    try { buf = await fetchMedia(mediaUrl, mediaKey, 'document'); }
    catch (e) { return { reply: `Nem sikerült letölteni a dokumentumot: ${e.message}` }; }

    const r2Key     = `wa/${phoneNumber.replace(/\+/g, '')}/${Date.now()}.pdf`;
    const publicUrl = r2PublicUrl(r2Key);
    await uploadToR2(r2Key, buf, 'application/pdf');
    return attachToRecord({ conversation, phoneNumber, waAccount, r2Key, publicUrl, mimeType: 'application/pdf', mediaType: forcedMediaType || 'document', fileName: caption || 'document.pdf', entryId });
  }

  return { reply: 'Ezt a médiafajtát még nem támogatom.' };
}

async function attachToRecord({ conversation, phoneNumber, waAccount, r2Key, publicUrl, mimeType, mediaType, fileName, entryId = null }) {
  const admin = createAdminClient();

  if (conversation.active_survey_id) {
    const { data: survey } = await admin.from('surveys').select('title').eq('id', conversation.active_survey_id).single();
    await admin.from('survey_media').insert({
      survey_id:      conversation.active_survey_id,
      entry_id:       entryId || null,
      drive_file_id:  r2Key,
      drive_view_url: publicUrl,
      thumbnail_url:  mediaType === 'photo' ? publicUrl : null,
      mime_type:      mimeType,
      file_name:      fileName,
      media_type:     mediaType,
    });
    const label = mediaType === 'video' ? 'Videó' : mediaType === 'document' ? 'Dokumentum' : mediaType === 'layout' ? 'Alaprajz' : 'Fotó';
    return { reply: `✓ ${label} csatolva a *${survey?.title || 'felmérés'}*hez.` };
  }

  if (conversation.active_project_id) {
    await admin.from('diary_photos').insert({
      drive_file_id:  r2Key,
      drive_view_url: publicUrl,
      thumbnail_url:  mediaType === 'photo' ? publicUrl : null,
      mime_type:      mimeType,
      uploaded_by:    waAccount.userId || null,
    });
    const { data: project } = await admin.from('projects').select('name').eq('id', conversation.active_project_id).single();
    const label = mediaType === 'video' ? 'Videó' : mediaType === 'document' ? 'Dokumentum' : 'Fotó';
    return { reply: `✓ ${label} csatolva a *${project?.name || 'projekt'}* naplójához.` };
  }

  // No active context — ask where to attach
  const { data: surveys } = await admin.from('surveys')
    .select('id, title')
    .eq('owner_id', waAccount.userId || '')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5);

  const options = (surveys || []).map(s => ({ id: s.id, name: s.title }));
  if (options.length) {
    await saveClarification(phoneNumber, 'survey_choice', options, 'attach_media', { r2Key, publicUrl, mimeType, mediaType, fileName });
    const list = options.map((o, i) => `${i + 1}. ${o.name}`).join('\n');
    return { reply: `Melyik felméréshez csatolom?\n\n${list}\n\nVálaszolj egy számmal, vagy írd: mégse` };
  }

  return { reply: 'Médiafájl mentve, de nincs aktív felmérés vagy projekt hozzácsatoláshoz. Válassz projektet: "projektek listája"' };
}

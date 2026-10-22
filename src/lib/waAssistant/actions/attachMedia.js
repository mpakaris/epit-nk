import { uploadToR2, r2PublicUrl, toWebp } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';
import { classifyImage } from '../classifyImage';
import { saveClarification } from '../clarification';

const MAX_VIDEO_BYTES = 10 * 1024 * 1024; // 10 MB

export async function attachMedia({ waAccount, conversation, mediaUrl, mimeType, caption, phoneNumber }) {
  if (!mediaUrl) return { reply: 'Nem sikerült letölteni a médiát. Kérlek próbáld újra.' };

  const isVideo    = mimeType?.startsWith('video/');
  const isImage    = mimeType?.startsWith('image/');
  const isDocument = mimeType === 'application/pdf' || mimeType?.startsWith('application/');

  // --- VIDEO ---
  if (isVideo) {
    const res = await fetch(mediaUrl);
    if (!res.ok) return { reply: 'Nem sikerült letölteni a videót. Kérlek próbáld újra.' };
    const buf = Buffer.from(await res.arrayBuffer());

    if (buf.length > MAX_VIDEO_BYTES) {
      return { reply: 'A videó túl nagy (max 10 MB). Kérlek rövidebb videót küldj.' };
    }

    const r2Key    = `wa/${phoneNumber.replace(/\+/g, '')}/${Date.now()}.mp4`;
    const publicUrl = r2PublicUrl(r2Key);
    await uploadToR2(r2Key, buf, 'video/mp4');

    return attachToRecord({ conversation, phoneNumber, waAccount, r2Key, publicUrl, mimeType: 'video/mp4', mediaType: 'video', fileName: 'video.mp4' });
  }

  // --- IMAGE ---
  if (isImage) {
    const res = await fetch(mediaUrl);
    if (!res.ok) return { reply: 'Nem sikerült letölteni a képet. Kérlek próbáld újra.' };
    const imgBuf = Buffer.from(await res.arrayBuffer());

    const webpBuf   = await toWebp(imgBuf);
    const imageBase64 = imgBuf.toString('base64');
    const imageType   = await classifyImage(imageBase64, mimeType || 'image/jpeg', { phoneNumber, userId: waAccount.userId });

    if (imageType === 'invoice') {
      return { handoffToInvoice: true, imgBuf, mimeType };
    }

    const r2Key    = `wa/${phoneNumber.replace(/\+/g, '')}/${Date.now()}.webp`;
    const publicUrl = r2PublicUrl(r2Key);
    await uploadToR2(r2Key, webpBuf, 'image/webp');

    return attachToRecord({ conversation, phoneNumber, waAccount, r2Key, publicUrl, mimeType: 'image/webp', mediaType: 'photo', fileName: 'photo.webp' });
  }

  // --- PDF / document ---
  if (isDocument) {
    const res = await fetch(mediaUrl);
    if (!res.ok) return { reply: 'Nem sikerült letölteni a dokumentumot. Kérlek próbáld újra.' };
    const buf = Buffer.from(await res.arrayBuffer());

    const r2Key    = `wa/${phoneNumber.replace(/\+/g, '')}/${Date.now()}.pdf`;
    const publicUrl = r2PublicUrl(r2Key);
    await uploadToR2(r2Key, buf, 'application/pdf');

    return attachToRecord({ conversation, phoneNumber, waAccount, r2Key, publicUrl, mimeType: 'application/pdf', mediaType: 'document', fileName: caption || 'document.pdf' });
  }

  return { reply: 'Ezt a médiafajtát még nem támogatom.' };
}

async function attachToRecord({ conversation, phoneNumber, waAccount, r2Key, publicUrl, mimeType, mediaType, fileName }) {
  const admin = createAdminClient();

  if (conversation.active_survey_id) {
    const { data: survey } = await admin.from('surveys').select('title').eq('id', conversation.active_survey_id).single();
    await admin.from('survey_media').insert({
      survey_id:      conversation.active_survey_id,
      drive_file_id:  r2Key,
      drive_view_url: publicUrl,
      thumbnail_url:  mediaType === 'photo' ? publicUrl : null,
      mime_type:      mimeType,
      file_name:      fileName,
      media_type:     mediaType,
    });
    const label = mediaType === 'video' ? 'Videó' : mediaType === 'document' ? 'Dokumentum' : 'Fotó';
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

import { uploadToR2 } from '@/lib/r2';

export async function transcribeVoiceNote(mediaUrl, phoneNumber) {
  const audioRes = await fetch(mediaUrl);
  if (!audioRes.ok) throw new Error(`Media fetch failed: ${audioRes.status}`);

  const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
  const mimeType    = audioRes.headers.get('content-type') || 'audio/ogg';

  const ext = mimeType.includes('mp4') || mimeType.includes('m4a') ? '.m4a'
    : mimeType.includes('mpeg') || mimeType.includes('mp3') ? '.mp3'
    : '.ogg';

  const r2Key = `wa/${phoneNumber.replace(/\+/g, '')}/${Date.now()}${ext}`;
  await uploadToR2(r2Key, audioBuffer, mimeType);

  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: mimeType }), `audio${ext}`);
  formData.append('model', 'whisper-1');
  formData.append('language', 'hu');
  formData.append('response_format', 'text');
  formData.append('prompt', 'Építési felmérés. Helyiség méretek, méteres értékek, burkolás, festés, csempe, vakolás.');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method:  'POST',
    headers: { Authorization: `Bearer ${process.env.OPEN_AI_OCR_KEY}` },
    body:    formData,
  });

  if (!res.ok) throw new Error(`Whisper error: ${res.status}`);

  const transcript = (await res.text()).trim();
  return { transcript, r2Key };
}

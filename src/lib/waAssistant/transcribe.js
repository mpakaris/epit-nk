import { logElevenLabsUsage } from './logAiUsage';
import { logAiCall } from './logAiCall';
import { decryptWhatsAppMedia } from './decryptMedia';

// Construction-domain keyterms — Scribe v2 supports up to 1,000
const KEYTERMS = [
  'burkolás', 'csempe', 'vakolás', 'festés', 'cement', 'ragasztó', 'fugázás',
  'konyha', 'fürdőszoba', 'nappali', 'hálószoba', 'előszoba', 'garázs', 'pince',
  'mennyezet', 'alapterület', 'felmérés', 'szegőléc', 'szigetelés', 'homlokzat',
  'ablak', 'ajtó', 'méter', 'négyzetméter', 'folyóméter', 'kilogramm', 'liter',
  'villanyszerelés', 'vízvezeték', 'gázszerelés', 'fűtés', 'padló', 'parkett',
  'laminált', 'gipszkarton', 'beton', 'tégla', 'ács', 'tetőfedés', 'cseréptető',
  'hőszigetelés', 'párazáró', 'csatorna', 'szennyvíz', 'lefolyó', 'klíma',
  'projekt', 'számla', 'ajánlat', 'anyagköltség', 'munkadíj', 'órabér',
  'felújítás', 'átalakítás', 'bővítés', 'alapozás', 'esztrichöntés', 'vakolat',
];

export async function transcribeVoiceNote(mediaUrl, phoneNumber, userId = null, mediaKey = null, waMessageId = null) {
  const apiKey = process.env.ELEVEN_LABS_SPEECH_TO_TEXT_API_KEY;
  if (!apiKey) throw new Error('ELEVEN_LABS_SPEECH_TO_TEXT_API_KEY not configured');

  let audioBuffer;
  let mimeType = 'audio/ogg';

  if (mediaKey && mediaUrl?.includes('whatsapp.net')) {
    // WhatsApp encrypted audio — decrypt before sending to ElevenLabs
    audioBuffer = await decryptWhatsAppMedia(mediaUrl, mediaKey, 'audio');
  } else {
    const audioRes = await fetch(mediaUrl);
    if (!audioRes.ok) throw new Error(`Media fetch failed: ${audioRes.status}`);
    audioBuffer = Buffer.from(await audioRes.arrayBuffer());
    mimeType    = audioRes.headers.get('content-type') || 'audio/ogg';
  }

  const ext = mimeType.includes('mp4') || mimeType.includes('m4a') ? '.m4a'
    : mimeType.includes('mpeg') || mimeType.includes('mp3') ? '.mp3'
    : '.ogg';

  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: mimeType }), `audio${ext}`);
  formData.append('model_id', 'scribe_v2');
  formData.append('language_code', 'hu');
  formData.append('tag_audio_events', 'false');
  // Each keyword as a separate field (ElevenLabs max 50 chars each)
  for (const term of KEYTERMS) {
    formData.append('keywords', term);
  }

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method:  'POST',
    headers: { 'xi-api-key': apiKey },
    body:    formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs STT error: ${res.status} — ${err}`);
  }

  const data       = await res.json();
  const transcript   = (data.text || '').trim();
  const audioSeconds = data.audio_duration_seconds ?? (audioBuffer.length / 16000);

  if (!transcript) throw new Error('ElevenLabs returned empty transcript');

  // Fire-and-forget: cost tracking + audit log
  logElevenLabsUsage({ phoneNumber, userId, audioSeconds }).catch(() => {});
  logAiCall({
    phoneNumber,
    waMessageId,
    provider:   'elevenlabs',
    callType:   'transcribe',
    model:      'scribe_v2',
    mediaType:  mimeType || 'audio/ogg',
    aiInput:    { audio_seconds: audioSeconds },
    aiOutput:   transcript,
    durationMs: null,
  });

  return { transcript };
}

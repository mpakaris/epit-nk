import { createClient } from '@/lib/supabase/server';
import { logElevenLabsUsage } from '@/lib/waAssistant/logAiUsage';
import { logAiCall } from '@/lib/waAssistant/logAiCall';

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

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const apiKey = process.env.ELEVEN_LABS_SPEECH_TO_TEXT_API_KEY;
  if (!apiKey) return Response.json({ error: 'ElevenLabs kulcs nincs konfigurálva' }, { status: 500 });

  const body = await request.formData();
  const audioFile = body.get('audio');
  if (!audioFile) return Response.json({ error: 'Nincs hangfájl' }, { status: 400 });

  const mimeType = audioFile.type || 'audio/webm';
  const ext = mimeType.includes('mp4') || mimeType.includes('m4a') ? '.m4a'
    : mimeType.includes('ogg') ? '.ogg'
    : mimeType.includes('mpeg') || mimeType.includes('mp3') ? '.mp3'
    : '.webm';

  const audioBuffer = await audioFile.arrayBuffer();

  const elForm = new FormData();
  elForm.append('file', new Blob([audioBuffer], { type: mimeType }), `recording${ext}`);
  elForm.append('model_id', 'scribe_v2');
  elForm.append('language_code', 'hu');
  elForm.append('tag_audio_events', 'false');
  for (const term of KEYTERMS) elForm.append('keywords', term);

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: elForm,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[transcribe] ElevenLabs error:', res.status, errText.slice(0, 300));
    const msg = res.status === 429
      ? 'Az átíró szerver forgalmas, kérjük próbáld újra.'
      : `Átírási hiba (${res.status})`;
    return Response.json({ error: msg }, { status: 502 });
  }

  const data = await res.json();
  const transcript   = (data.text || '').trim();
  const audioSeconds = data.audio_duration_seconds ?? (audioBuffer.byteLength / 16000);

  if (!transcript) return Response.json({ error: 'Nem sikerült felismerni a szöveget' }, { status: 422 });

  // Fire-and-forget: cost + full transcript log
  logElevenLabsUsage({ phoneNumber: null, userId: user.id, audioSeconds }).catch(() => {});
  logAiCall({
    phoneNumber: null,
    provider:    'elevenlabs',
    callType:    'transcribe',
    model:       'scribe_v2',
    mediaType:   mimeType,
    aiInput:     { audio_seconds: audioSeconds, source: 'browser' },
    aiOutput:    transcript,
  });

  return Response.json({ transcript });
}

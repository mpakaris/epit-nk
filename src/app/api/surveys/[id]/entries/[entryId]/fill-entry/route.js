import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logOpenAiUsage } from '@/lib/waAssistant/logAiUsage';
import { logAiCall } from '@/lib/waAssistant/logAiCall';
import { checkSurveyAccess } from '@/lib/surveyAccess';

const MODEL = 'gpt-4o';

export async function POST(request, { params }) {
  const { id: surveyId, entryId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: survey } = await admin.from('surveys')
    .select('owner_id, created_by, collective_id').eq('id', surveyId).single();
  if (!survey) return Response.json({ error: 'Not found' }, { status: 404 });

  const access = await checkSurveyAccess(admin, survey, user.id, surveyId);
  if (!access.allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { data: entry } = await admin.from('survey_entries')
    .select('name, width_m, length_m, height_m, window_count, door_count').eq('id', entryId).eq('survey_id', surveyId).single();
  if (!entry) return Response.json({ error: 'Helyiség nem található' }, { status: 404 });

  const { transcript } = await request.json();
  if (!transcript?.trim()) return Response.json({ error: 'Nincs szöveg' }, { status: 400 });

  const apiKey = process.env.OPEN_AI_OCR_KEY;
  if (!apiKey) return Response.json({ error: 'AI konfigurációs hiba' }, { status: 500 });

  const currentDims = [
    entry.width_m  != null ? `szélesség: ${entry.width_m} m` : null,
    entry.length_m != null ? `hosszúság: ${entry.length_m} m` : null,
    entry.height_m != null ? `belmagasság: ${entry.height_m} m` : null,
    entry.window_count > 0 ? `${entry.window_count} ablak` : null,
    entry.door_count   > 0 ? `${entry.door_count} ajtó`   : null,
  ].filter(Boolean).join(', ');

  const userPrompt = `Helyiség: "${entry.name}"${currentDims ? ` (jelenlegi adatok: ${currentDims})` : ''}

Hangfelvétel átirata: "${transcript}"

Azonosítsd ki a méreti adatokat és írj tömör leírást a munkákról.

Szabályok:
- Csak azt add meg, amit az átiratban EXPLICITEN mondtak — ne becsülj
- A description: tömör, olvasható összefoglaló a munkákról és állapotokról (töltelékszavak nélkül)
- Ha méret nincs az átiratban, azt null-ként add meg
- Ablak/ajtó darabszám: csak egész szám

Válasz KIZÁRÓLAG ebben a JSON formátumban:
{
  "width_m":      number|null,
  "length_m":     number|null,
  "height_m":     number|null,
  "window_count": number|null,
  "door_count":   number|null,
  "description":  "string|null"
}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: userPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 400,
      }),
    });
    const raw = await res.json();
    if (!res.ok) return Response.json({ error: raw.error?.message || 'AI hiba' }, { status: 502 });

    const rawContent = raw.choices[0].message.content;
    logOpenAiUsage({ phoneNumber: null, userId: user.id, model: MODEL, callType: 'fill_entry', usage: raw.usage }).catch(() => {});
    logAiCall({ phoneNumber: null, provider: 'openai', callType: 'fill_entry', model: MODEL,
      userInput: transcript, aiOutput: rawContent,
      tokensIn: raw.usage?.prompt_tokens, tokensOut: raw.usage?.completion_tokens });

    let aiData;
    try { aiData = JSON.parse(rawContent); }
    catch { return Response.json({ error: 'AI válasz feldolgozási hiba' }, { status: 502 }); }

    const fields = {
      width_m:      typeof aiData.width_m  === 'number' && isFinite(aiData.width_m)  ? aiData.width_m  : null,
      length_m:     typeof aiData.length_m === 'number' && isFinite(aiData.length_m) ? aiData.length_m : null,
      height_m:     typeof aiData.height_m === 'number' && isFinite(aiData.height_m) ? aiData.height_m : null,
      window_count: typeof aiData.window_count === 'number' ? Math.round(aiData.window_count) : null,
      door_count:   typeof aiData.door_count   === 'number' ? Math.round(aiData.door_count)   : null,
      description:  typeof aiData.description === 'string'  ? aiData.description.substring(0, 1000) : null,
    };

    return Response.json({ fields });
  } catch (e) {
    return Response.json({ error: `AI hiba: ${e.message}` }, { status: 502 });
  }
}

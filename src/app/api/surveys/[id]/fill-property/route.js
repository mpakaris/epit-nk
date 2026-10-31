import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logOpenAiUsage } from '@/lib/waAssistant/logAiUsage';
import { logAiCall } from '@/lib/waAssistant/logAiCall';
import { checkSurveyAccess } from '@/lib/surveyAccess';

const MODEL = 'gpt-4o';

export async function POST(request, { params }) {
  const { id: surveyId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: survey } = await admin.from('surveys')
    .select('owner_id, created_by, collective_id').eq('id', surveyId).single();
  if (!survey) return Response.json({ error: 'Not found' }, { status: 404 });

  const access = await checkSurveyAccess(admin, survey, user.id, surveyId);
  if (!access.allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { transcript } = await request.json();
  if (!transcript?.trim()) return Response.json({ error: 'Nincs szöveg' }, { status: 400 });

  const apiKey = process.env.OPEN_AI_OCR_KEY;
  if (!apiKey) return Response.json({ error: 'AI konfigurációs hiba' }, { status: 500 });

  const systemPrompt = `Te egy tapasztalt magyar építőipari szakember asszisztense vagy. Csak JSON-t adsz vissza, semmi mást.`;

  const userPrompt = `Az alábbi hangfelvétel-átirat egy ingatlan általános adatait tartalmazza.
Azonosítsd ki az adatokat és töltsd ki a struktúrált mezőket.

Átirat: "${transcript}"

Fűtési típus lehetséges értékei: "radiátor", "padlófűtés", "hőszivattyú", "gázkazán", "olajkazán", "elektromos", "egyéb"
Ha több fűtési típus van, vesszővel elválasztva add meg (pl. "gázkazán, padlófűtés").

Válasz KIZÁRÓLAG ebben a JSON formátumban (ismeretlen érték = null):
{
  "plot_size_m2": number|null,
  "garden_size_m2": number|null,
  "electrical_phases": 1|3|null,
  "electrical_ampere": number|null,
  "electrical_voltage": number|null,
  "heating_type": "string"|null,
  "property_notes": "string"|null
}`;

  let aiData;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 500,
      }),
    });
    const raw = await res.json();
    if (!res.ok) return Response.json({ error: raw.error?.message || 'AI hiba' }, { status: 502 });

    logOpenAiUsage({ phoneNumber: null, userId: user.id, model: MODEL, callType: 'fill_property', usage: raw.usage }).catch(() => {});
    const rawContent = raw.choices[0].message.content;
    logAiCall({
      phoneNumber: null,
      provider: 'openai', callType: 'fill_property', model: MODEL,
      userInput: transcript, aiOutput: rawContent,
      tokensIn: raw.usage?.prompt_tokens, tokensOut: raw.usage?.completion_tokens,
    });

    try { aiData = JSON.parse(rawContent); }
    catch { return Response.json({ error: 'AI válasz feldolgozási hiba' }, { status: 502 }); }
  } catch (e) {
    return Response.json({ error: `AI hiba: ${e.message}` }, { status: 502 });
  }

  const fields = {
    plot_size_m2:       typeof aiData.plot_size_m2 === 'number'       ? aiData.plot_size_m2       : null,
    garden_size_m2:     typeof aiData.garden_size_m2 === 'number'     ? aiData.garden_size_m2     : null,
    electrical_phases:  aiData.electrical_phases === 1 || aiData.electrical_phases === 3 ? aiData.electrical_phases : null,
    electrical_ampere:  typeof aiData.electrical_ampere === 'number'  ? aiData.electrical_ampere  : null,
    electrical_voltage: typeof aiData.electrical_voltage === 'number' ? aiData.electrical_voltage : null,
    heating_type:       typeof aiData.heating_type === 'string'       ? aiData.heating_type.substring(0, 200) : null,
    property_notes:     typeof aiData.property_notes === 'string'     ? aiData.property_notes.substring(0, 2000) : null,
  };

  return Response.json({ fields });
}

import { createClient } from '@/lib/supabase/server';
import { logOpenAiUsage } from '@/lib/waAssistant/logAiUsage';
import { logAiCall } from '@/lib/waAssistant/logAiCall';

const MODEL = 'gpt-4o-mini';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { transcript } = await request.json();
  if (!transcript?.trim()) return Response.json({ error: 'Nincs szöveg' }, { status: 400 });

  const apiKey = process.env.OPEN_AI_OCR_KEY;
  if (!apiKey) return Response.json({ error: 'AI konfigurációs hiba' }, { status: 500 });

  const userPrompt = `Formázd meg az alábbi hangfelvétel-átiratot olvasható, tömör felmérési megjegyzéssé.

Szabályok:
- Semmit ne hagyj ki és ne találj ki — csak azt tartalmazza, amit a felhasználó mondott
- Távolítsd el a töltelékszavakat (szóval, hát, ugye, tehát, na)
- Tördelj bekezdésekre vagy rövid felsorolásra ahol logikus
- Magyarul maradj
- Ha egyetlen rövid mondat, hagyd úgy — ne fújd fel

Átirat: "${transcript}"

Válasz: csak a formázott szöveg, semmi más.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.2,
        max_tokens: 600,
      }),
    });
    const raw = await res.json();
    if (!res.ok) return Response.json({ error: raw.error?.message || 'AI hiba' }, { status: 502 });

    const formatted = (raw.choices[0].message.content || '').trim();

    logOpenAiUsage({ phoneNumber: null, userId: user.id, model: MODEL, callType: 'format_notes', usage: raw.usage }).catch(() => {});
    logAiCall({
      phoneNumber: null,
      provider: 'openai', callType: 'format_notes', model: MODEL,
      userInput: transcript, aiOutput: formatted,
      tokensIn: raw.usage?.prompt_tokens, tokensOut: raw.usage?.completion_tokens,
    });

    return Response.json({ formatted });
  } catch (e) {
    return Response.json({ error: `AI hiba: ${e.message}` }, { status: 502 });
  }
}

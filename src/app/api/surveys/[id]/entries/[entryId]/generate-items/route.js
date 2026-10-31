import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logOpenAiUsage } from '@/lib/waAssistant/logAiUsage';
import { checkSurveyAccess } from '@/lib/surveyAccess';

const MODEL = 'gpt-4o';

export async function POST(request, { params }) {
  const { id: surveyId, entryId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { data: survey } = await admin.from('surveys').select('owner_id, collective_id, shared_with, created_by').eq('id', surveyId).single();
  if (!survey) return Response.json({ error: 'Not found' }, { status: 404 });

  if (profile.role !== 'superadmin') {
    const access = await checkSurveyAccess(admin, survey, user.id, surveyId);
    if (!access.allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: entry } = await admin.from('survey_entries')
    .select('id, name, description, width_m, length_m, height_m, size_m2, window_count, door_count')
    .eq('id', entryId).eq('survey_id', surveyId).single();
  if (!entry) return Response.json({ error: 'Helyiség nem található' }, { status: 404 });

  const apiKey = process.env.OPEN_AI_OCR_KEY;
  if (!apiKey) return Response.json({ error: 'AI konfigurációs hiba' }, { status: 500 });

  const w = entry.width_m, l = entry.length_m, h = entry.height_m;
  const area = entry.size_m2 ?? (w && l ? w * l : null);
  const perim = w && l ? 2 * (w + l) : null;
  const wallM2 = perim && h ? (perim * h - (entry.window_count || 0) * 1.5 - (entry.door_count || 0) * 2.0) : null;

  const dimParts = [];
  if (w && l) dimParts.push(`${w}×${l} m`);
  if (area)   dimParts.push(`${area.toFixed(1)} m² alapterület`);
  if (h)      dimParts.push(`${h} m belmagasság`);
  if (wallM2) dimParts.push(`~${wallM2.toFixed(1)} m² falfelület`);
  if (entry.window_count) dimParts.push(`${entry.window_count} ablak`);
  if (entry.door_count)   dimParts.push(`${entry.door_count} ajtó`);

  const systemPrompt = `Te egy tapasztalt magyar építőipari szakember asszisztense vagy. Precízen, tömören válaszolsz. Csak JSON-t adsz vissza, semmi mást.`;

  const userPrompt = `Helyiség: ${entry.name}${dimParts.length ? ` (${dimParts.join(', ')})` : ''}
Megjegyzés a felhasználótól: "${entry.description || '(nincs)'}"

Feladatod:
1. MINDEN munkafázist és anyagot sorold fel, amit a felhasználó EXPLICIT említett VAGY ami az említett munkából KÖZVETLENÜL következik.
   Példa: ha "burkolás" szerepel → add hozzá: csempe (m²), csempe ragasztó (zsák), fugázóanyag (zsák) ÉS csempézési munkadíj (m²).
   Példa: ha "festés" szerepel → festék (l), alapozó (l) ÉS festési munkadíj (m²).
   (source: "user_note")

2. Javasolj MAX 3 hiányzó tételt — előnyben a MUNKADÍJ tételek, mert a magyar vállalkozók profitja a munkadíjból jön, az anyag 1:1 áthárítás.
   (source: "ai_suggestion")

3. Minden tételnél add meg a reális mennyiséget a méretek alapján.

entry_type és unit szabályok (KÖTELEZŐ):
- "material" = anyag → unit: "m²", "db", "zsák", "kg", "l"
- "labour" = munkadíj:
    · Felületalapú munka (csempézés, festés, vakolás, glettelés, burkolás) → unit: "m²"
    · Szerelési / összerakási munka (bútor, csap, ajtó, ablak, lámpa, radiátor) → unit: "h"
    · Darabszámos munka (pl. konnektorbővítés, csatlakozó) → unit: "db"
- "equipment" = gép/eszközbérlés → unit: "nap" vagy "db"
- "transport" = szállítás → unit: "db" vagy "km"
- "other" = egyéb

Válasz szigorúan ebben a JSON formátumban (egyéb szöveg nélkül):
{
  "from_notes": [
    { "description": "string", "quantity": number|null, "unit": "string|null", "entry_type": "material|labour|equipment|transport|other" }
  ],
  "suggestions": [
    { "description": "string", "quantity": number|null, "unit": "string|null", "entry_type": "material|labour|equipment|transport|other" }
  ]
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
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });
    const raw = await res.json();
    if (!res.ok) return Response.json({ error: raw.error?.message || 'AI hiba' }, { status: 502 });
    // Log cost against user account (fire-and-forget)
    logOpenAiUsage({ phoneNumber: null, userId: user.id, model: MODEL, callType: 'generate_items', usage: raw.usage }).catch(() => {});
    try {
      aiData = JSON.parse(raw.choices[0].message.content);
    } catch (parseErr) {
      console.error('[generate-items] JSON parse failed:', raw.choices?.[0]?.message?.content?.slice(0, 300));
      return Response.json({ error: 'AI válasz feldolgozási hiba (JSON)' }, { status: 502 });
    }
  } catch (e) {
    console.error('[generate-items] fetch error:', e.message);
    return Response.json({ error: `AI hiba: ${e.message}` }, { status: 502 });
  }

  const fromNotes   = (aiData.from_notes   || []).map(i => ({ ...i, source: 'user_note',      is_confirmed: true  }));
  const suggestions = (aiData.suggestions  || []).slice(0, 3).map(i => ({ ...i, source: 'ai_suggestion',  is_confirmed: false }));

  // Persist all items to DB
  const validTypes = new Set(['material', 'labour', 'equipment', 'transport', 'other']);
  const toInsert = [...fromNotes, ...suggestions].map((item, idx) => ({
    survey_id:    surveyId,
    entry_id:     entryId,
    owner_id:     user.id,
    created_by:   user.id,
    description:  item.description,
    quantity:     item.quantity != null ? Number(item.quantity) : null,
    unit:         item.unit || null,
    entry_type:   validTypes.has(item.entry_type) ? item.entry_type : 'material',
    source:       item.source,
    is_confirmed: item.is_confirmed,
    sort_order:   idx,
  }));

  const { data: inserted, error: insertErr } = await admin.from('survey_entry_items').insert(toInsert).select();
  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

  return Response.json({ items: inserted, from_notes: fromNotes, suggestions });
}

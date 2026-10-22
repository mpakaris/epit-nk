import { logOpenAiUsage } from './logAiUsage';

const INTENT_ENUM = [
  'create_survey', 'add_survey_entry', 'create_labour_entry', 'create_invoice',
  'attach_media', 'query_costs', 'query_survey', 'create_client',
  'list_projects', 'list_surveys', 'set_active_project', 'set_active_survey',
  'greeting', 'unknown',
];

const FALLBACK = { intent: 'unknown', confidence: 0, extracted: {}, requires_clarification: false, clarification_reason: null };

export async function resolveIntent({ messageText, contentType, contextWindow, userContext, phoneNumber, userId }) {
  const apiKey = process.env.OPEN_AI_OCR_KEY;
  if (!apiKey) return FALLBACK;

  const systemPrompt = `Te az OkosSzaki építési asszisztens vagy. Angolul és magyarul is értesz — a felhasználó bármelyik nyelven írhat, te mindig magyarul válaszolsz.

--- Felhasználói kontextus ---
${userContext || 'Nincs elérhető kontextus.'}
--- Kontextus vége ---

Szándék-kategóriák:
- create_survey: új felmérés indítása ("felmérés", "create a new survey", "kezdjük a felmérést")
- add_survey_entry: helyiség/terület méreteinek rögzítése ("konyha 3.5x4.2m", "kitchen 3.5x4.2m")
- create_labour_entry: munkaidő rögzítése ("8 óra burkolás", "8 hours tiling")
- create_invoice: számla/költség rögzítése ("45000 Ft csempe", "invoice for tiles")
- attach_media: fotó/videó/dokumentum csatolása
- query_costs: projekt költségeinek lekérdezése ("mennyit költöttünk?", "what did we spend?")
- query_survey: felmérési adatok lekérdezése ("mit mértünk?", "show survey notes")
- create_client: ügyfél rögzítése
- list_projects: projektek listázása
- list_surveys: felmérések listázása
- set_active_project: projektre váltás
- set_active_survey: felmérésre váltás
- greeting: üdvözlés, általános kérdés
- unknown: nem egyértelmű szándék

Mezők kinyerése:
- surveyTitle: felmérés neve az üzenetből (pl. "Gabor's Kitchen Renovation", "Fürdőszoba felmérés")
- survey_entry: name (helyiség neve), widthM, lengthM, heightM (számok), windowCount, doorCount (egészek)
- labour: labourType, hours (szám), hourlyRate (szám vagy null), workDate (YYYY-MM-DD vagy null)
- invoice: amountHuf (szám), description, category ('Anyag'|'Szerszám/Eszköz'|'Szállítás'|'Engedély/Hatóság'|'Egyéb')
  Kategória: csempe/festék/cement/fa/anyag → Anyag; szállítás/fuvar → Szállítás; szerszám/eszköz → Szerszám/Eszköz; engedély/hatóság → Engedély/Hatóság; egyéb → Egyéb
- project_hint: projekt neve/részlete az üzenetből
- workspace_hint: "personal" ha az üzenet személyes munkaterületre utal, kollektíva neve ha arra utal, null ha nincs utalás

FONTOS: ne találj ki adatokat. Ha egy mező hiányzik, hagyd null-ra.
Magyar szám-szavak: "három és fél" → 3.5, "négyezer" → 4000, "negyvenötezer" → 45000`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(Array.isArray(contextWindow) ? contextWindow : []),
    { role: 'user', content: messageText || `(${contentType || 'media'})` },
  ];

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name:   'intent_classification',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                intent:                 { type: 'string', enum: INTENT_ENUM },
                confidence:             { type: 'number' },
                extracted:              { type: 'object', additionalProperties: true },
                requires_clarification: { type: 'boolean' },
                clarification_reason:   { type: 'string' },
              },
              required: ['intent', 'confidence', 'extracted', 'requires_clarification', 'clarification_reason'],
              additionalProperties: false,
            },
          },
        },
        max_tokens:  500,
        temperature: 0,
      }),
    });

    if (!res.ok) return FALLBACK;

    const data = await res.json();
    const raw  = data.choices?.[0]?.message?.content;
    if (!raw) return FALLBACK;

    // Fire-and-forget usage logging
    if (data.usage && phoneNumber) {
      logOpenAiUsage({ phoneNumber, userId, model: 'gpt-4o', callType: 'intent', usage: data.usage })
        .catch(() => {});
    }

    return JSON.parse(raw);
  } catch {
    return FALLBACK;
  }
}

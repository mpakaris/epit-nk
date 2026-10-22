import { logOpenAiUsage } from './logAiUsage';

const INTENT_ENUM = [
  'create_survey', 'add_survey_entry', 'create_labour_entry', 'create_invoice',
  'attach_media', 'query_costs', 'query_survey', 'create_client',
  'list_projects', 'list_surveys', 'set_active_project', 'set_active_survey',
  'greeting', 'unknown',
];

const FALLBACK = { intent: 'unknown', confidence: 0, extracted: {}, requires_clarification: false, clarification_reason: null };

export async function resolveIntent({ messageText, contentType, contextWindow, activeProjectName, activeSurveyName, phoneNumber, userId }) {
  const apiKey = process.env.OPEN_AI_OCR_KEY;
  if (!apiKey) return FALLBACK;

  const systemPrompt = `Te az OkosSzaki építési asszisztens vagy. Magyar anyanyelvű kivitelezőkkel kommunikálsz.
Az üzenetből azonosítsd a szándékot és nyerd ki a strukturált adatokat.

Aktív projekt: ${activeProjectName || 'nincs kiválasztva'}
Aktív felmérés: ${activeSurveyName || 'nincs aktív felmérés'}

Szándék-kategóriák:
- create_survey: új felmérés indítása ("felmérés", "kezdjük a felmérést", "új felmérés")
- add_survey_entry: helyiség/terület méreteinek rögzítése ("konyha 3.5x4.2m", "fürdőszoba méretei")
- create_labour_entry: munkaidő rögzítése ("8 óra burkolás", "ma 6 óra festés")
- create_invoice: számla/költség rögzítése ("45000 Ft csempe", "anyagszámla")
- attach_media: fotó/videó/dokumentum csatolása
- query_costs: projekt költségeinek lekérdezése ("mennyit költöttünk?", "mi az egyenleg?")
- query_survey: felmérési adatok lekérdezése ("mit mértünk a konyhában?")
- create_client: ügyfél rögzítése
- list_projects: projektek listázása ("mutasd a projektjeimet")
- list_surveys: felmérések listázása
- set_active_project: projektre váltás ("a Kovács projekthez", "válts Péter projektjére")
- set_active_survey: felmérésre váltás
- greeting: üdvözlés, általános kérdés
- unknown: nem egyértelmű szándék

Mezők kinyerése:
- survey_entry: name (helyiség neve), widthM (szám), lengthM (szám), heightM (szám), windowCount (egész), doorCount (egész)
- labour: labourType (munkafajta), hours (szám), hourlyRate (szám vagy null), workDate (YYYY-MM-DD vagy null)
- invoice: amountHuf (szám), description (szöveg), category ('Anyag'|'Szerszám/Eszköz'|'Szállítás'|'Engedély/Hatóság'|'Egyéb')
  Kategória szabályok: csempe/festék/cement/fa/anyag → Anyag; szállítás/fuvar → Szállítás; szerszám/eszköz/állványzat → Szerszám/Eszköz; engedély/hatóság/illeték → Engedély/Hatóság; egyéb → Egyéb
- surveyTitle: a felmérés neve, ha az üzenetben szerepel (pl. "WA Test No. 1", "Fürdőszoba felmérés") — angolul is elfogadható
- project_hint: projekt neve/részlete az üzenetből

FONTOS: ne találj ki adatokat. Ha egy mező hiányzik, hagyd null-ra.
Magyar szám-szavak konvertálása: "három és fél" → 3.5, "négyezer" → 4000, "negyvenötezer" → 45000`;

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

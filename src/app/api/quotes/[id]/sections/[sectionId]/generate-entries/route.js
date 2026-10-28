import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logOpenAiUsage } from '@/lib/waAssistant/logAiUsage';
import { logAiCall } from '@/lib/waAssistant/logAiCall';

const MODEL = 'gpt-4o';

export async function POST(request, { params }) {
  const { id: quoteId, sectionId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles')
    .select('id, role, active_collective_id').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { data: quote } = await admin.from('quotes')
    .select('id, owner_id, created_by, collective_id, survey_id').eq('id', quoteId).single();
  if (!quote) return Response.json({ error: 'Ajánlat nem található' }, { status: 404 });

  if (profile.role !== 'superadmin') {
    const isOwner = quote.owner_id === user.id || quote.created_by === user.id;
    if (!isOwner) {
      if (!quote.collective_id) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { data: mem } = await admin.from('collective_members')
        .select('role').eq('collective_id', quote.collective_id).eq('user_id', user.id).eq('status', 'active').maybeSingle();
      if (!mem) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { data: section } = await admin.from('quote_sections')
    .select('id, name, description, width_m, length_m, size_m2, height_m, window_count, door_count')
    .eq('id', sectionId).eq('quote_id', quoteId).single();
  if (!section) return Response.json({ error: 'Szekció nem található' }, { status: 404 });

  const { transcript } = await request.json();
  if (!transcript?.trim()) return Response.json({ error: 'Nincs szöveg' }, { status: 400 });

  const apiKey = process.env.OPEN_AI_OCR_KEY;
  if (!apiKey) return Response.json({ error: 'AI konfigurációs hiba' }, { status: 500 });

  // Load user's catalogue for price lookup
  const collectiveId = profile.active_collective_id;
  let catQuery = admin.from('catalogue_items').select('name, unit, labour_price, materials, trade').eq('is_active', true);
  if (collectiveId) {
    catQuery = catQuery.or(`owner_id.eq.${user.id},collective_id.eq.${collectiveId}`);
  } else {
    catQuery = catQuery.eq('owner_id', user.id).is('collective_id', null);
  }
  const { data: catalogueItems = [] } = await catQuery.order('trade').order('name');

  // Build dimension context
  const w = Number(section.width_m), l = Number(section.length_m), h = Number(section.height_m);
  const area    = w > 0 && l > 0 ? w * l : (section.size_m2 ? Number(section.size_m2) : null);
  const perim   = w > 0 && l > 0 ? 2 * (w + l) : null;
  const wallM2  = perim && h > 0 ? Math.max(0, perim * h - (section.window_count || 0) * 1.5 - (section.door_count || 0) * 2.0) : null;

  const dimParts = [];
  if (w > 0 && l > 0) dimParts.push(`${w}×${l} m`);
  if (area)   dimParts.push(`${area.toFixed(1)} m² alapterület`);
  if (h > 0)  dimParts.push(`${h} m belmagasság`);
  if (wallM2) dimParts.push(`~${wallM2.toFixed(1)} m² falfelület`);
  if (section.window_count) dimParts.push(`${section.window_count} ablak`);
  if (section.door_count)   dimParts.push(`${section.door_count} ajtó`);

  const catContext = catalogueItems.length > 0
    ? `\n\nFelhasználó árkatalógusa (ezekből adj ajánlatot ha illeszkedik):\n`
      + catalogueItems.slice(0, 60).map(c =>
          `- ${c.name} | egység: ${c.unit}${c.labour_price ? ` | munkadíj: ${c.labour_price} Ft/${c.unit}` : ''}${c.trade ? ` [${c.trade}]` : ''}`
        ).join('\n')
    : '';

  const systemPrompt = `Te egy tapasztalt magyar építőipari szakember asszisztense vagy. Pontos, tömör JSON-t adsz vissza, semmi mást.`;

  const userPrompt = `Szekció: "${section.name}"${dimParts.length ? ` (${dimParts.join(', ')})` : ''}

Hangfelvétel átirata (amit a szakember mondott erről a szekcióról):
"${transcript}"
${catContext}

Feladatod:
1. Elemezd az átiratot. Azonosítsd az összes említett munkát, anyagot, feladatot.
2. Minden egyes munkafázishoz és anyaghoz hozz létre egy-egy árajánlat-tételt.
3. Ha a méretek adottak, számítsd ki a mennyiségeket (pl. csempézés → padlóterület m², festés → falfelület m²).
4. Ha az árkatalógusban szerepel az adott tétel, HASZNÁLD ANNAK árát. Ha nincs, hagyd a unit_price-t null-on.
5. Magyar szaknyelven írj.

entry_type szabályok:
- "material" = anyag, alapanyag → mennyiség × egységár
- "labour" = munkadíj → mennyiség × egységár
- "equipment" = gépbérlés, eszközbérlés → flat összeg
- "transport" = szállítás → flat összeg
- "other" = egyéb

Válasz KIZÁRÓLAG ebben a JSON formátumban:
{
  "entries": [
    {
      "entry_type": "material|labour|equipment|transport|other",
      "work_description": "string",
      "quantity": number|null,
      "unit": "string|null",
      "unit_price": number|null,
      "flat_amount": number|null,
      "notes": "string|null"
    }
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
        max_tokens: 2000,
      }),
    });
    const raw = await res.json();
    if (!res.ok) return Response.json({ error: raw.error?.message || 'AI hiba' }, { status: 502 });
    logOpenAiUsage({ phoneNumber: null, userId: user.id, model: MODEL, callType: 'generate_quote_entries', usage: raw.usage }).catch(() => {});
    const rawContent = raw.choices[0].message.content;
    logAiCall({
      phoneNumber: null,
      provider:    'openai',
      callType:    'generate_quote_entries',
      model:       MODEL,
      userInput:   transcript,
      aiInput:     { section: section.name, dimensions: dimParts, catalogue_count: catalogueItems.length },
      aiOutput:    rawContent,
      tokensIn:    raw.usage?.prompt_tokens,
      tokensOut:   raw.usage?.completion_tokens,
    });
    try { aiData = JSON.parse(rawContent); }
    catch { return Response.json({ error: 'AI válasz feldolgozási hiba' }, { status: 502 }); }
  } catch (e) {
    return Response.json({ error: `AI hiba: ${e.message}` }, { status: 502 });
  }

  const validTypes = new Set(['material', 'labour', 'equipment', 'transport', 'other']);
  const entries = (aiData.entries || []).slice(0, 20).map(e => ({
    entry_type:       validTypes.has(e.entry_type) ? e.entry_type : 'other',
    work_description: String(e.work_description || '').substring(0, 500),
    quantity:         typeof e.quantity === 'number' && isFinite(e.quantity) ? e.quantity : null,
    unit:             e.unit ? String(e.unit).substring(0, 30) : null,
    unit_price:       typeof e.unit_price === 'number' && isFinite(e.unit_price) ? Math.round(e.unit_price) : null,
    flat_amount:      typeof e.flat_amount === 'number' && isFinite(e.flat_amount) ? Math.round(e.flat_amount) : null,
    notes:            e.notes ? String(e.notes).substring(0, 300) : null,
  })).filter(e => e.work_description);

  return Response.json({ entries });
}

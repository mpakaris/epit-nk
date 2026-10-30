import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logOpenAiUsage } from '@/lib/waAssistant/logAiUsage';

const MODEL = 'gpt-4o';

export async function POST(request, { params }) {
  const { id: quoteId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles')
    .select('id, role').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { data: quote } = await admin.from('quotes')
    .select('id, owner_id, created_by, collective_id').eq('id', quoteId).single();
  if (!quote) return Response.json({ error: 'Ajánlat nem található' }, { status: 404 });

  if (profile.role !== 'superadmin') {
    const isOwner = quote.owner_id === user.id || quote.created_by === user.id;
    if (!isOwner) {
      if (!quote.collective_id) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { data: mem } = await admin.from('collective_members')
        .select('role').eq('collective_id', quote.collective_id)
        .eq('user_id', user.id).eq('status', 'active').maybeSingle();
      if (!mem) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { transcript, sectionId } = await request.json();
  if (!transcript?.trim()) return Response.json({ error: 'Nincs szöveg' }, { status: 400 });

  const apiKey = process.env.OPEN_AI_OCR_KEY;
  if (!apiKey) return Response.json({ error: 'AI konfigurációs hiba' }, { status: 500 });

  // Optional section context for quantity calculations
  let sectionContext = '';
  if (sectionId) {
    const { data: section } = await admin.from('quote_sections')
      .select('name, width_m, length_m, size_m2, height_m, window_count, door_count')
      .eq('id', sectionId).eq('quote_id', quoteId).single();
    if (section) {
      const w = Number(section.width_m), l = Number(section.length_m), h = Number(section.height_m);
      const area   = w > 0 && l > 0 ? w * l : (section.size_m2 ? Number(section.size_m2) : null);
      const perim  = w > 0 && l > 0 ? 2 * (w + l) : null;
      const wallM2 = perim && h > 0 ? Math.max(0, perim * h - (section.window_count || 0) * 1.5 - (section.door_count || 0) * 2.0) : null;
      const parts  = [];
      if (area)   parts.push(`${area.toFixed(1)} m² alapterület`);
      if (h > 0)  parts.push(`${h} m belmagasság`);
      if (wallM2) parts.push(`~${wallM2.toFixed(1)} m² falfelület`);
      if (parts.length) sectionContext = `\nSzekció: "${section.name}" (${parts.join(', ')})`;
    }
  }

  const systemPrompt = `Te egy tapasztalt magyar építőipari szakember asszisztense vagy. Egyetlen árajánlat-tételt elemzel és strukturált JSON-t adsz vissza, semmi mást.`;

  const userPrompt = `Elemezd az alábbi hangfelvétel-átiratot és azonosítsd EGYETLEN árajánlat-tételt.${sectionContext}

Átirat: "${transcript}"

entry_type szabályok:
- "material" = anyag, alapanyag (csempe, festék, gipszkarton…) → quantity × unit_price
- "labour"   = munkadíj, beépítés (csempézés, festés, szerelés…) → quantity × unit_price
- "equipment" = gép-/eszközbérlés → flat_amount
- "transport" = szállítás → flat_amount
- "other"    = egyéb → flat_amount

Ha a szekcióban vannak méretek és a tétel mennyisége levezethető (pl. festés → falfelület), számítsd ki a mennyiséget.
Ha egységár nincs megadva, hagyd null-on.

Válasz KIZÁRÓLAG ebben a JSON formátumban, egyetlen objektum:
{
  "entry_type": "material|labour|equipment|transport|other",
  "work_description": "string",
  "quantity": number|null,
  "unit": "string|null",
  "unit_price": number|null,
  "flat_amount": number|null,
  "notes": "string|null"
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
        temperature: 0.2,
        max_tokens: 300,
      }),
    });
    const raw = await res.json();
    if (!res.ok) return Response.json({ error: raw.error?.message || 'AI hiba' }, { status: 502 });
    logOpenAiUsage({ phoneNumber: null, userId: user.id, model: MODEL, callType: 'parse_quote_entry', usage: raw.usage }).catch(() => {});
    try { aiData = JSON.parse(raw.choices[0].message.content); }
    catch { return Response.json({ error: 'AI válasz feldolgozási hiba' }, { status: 502 }); }
  } catch (e) {
    return Response.json({ error: `AI hiba: ${e.message}` }, { status: 502 });
  }

  const validTypes = new Set(['material', 'labour', 'equipment', 'transport', 'other']);
  const entry = {
    entry_type:       validTypes.has(aiData.entry_type) ? aiData.entry_type : 'other',
    work_description: String(aiData.work_description || '').substring(0, 500),
    quantity:         typeof aiData.quantity === 'number' && isFinite(aiData.quantity) ? aiData.quantity : null,
    unit:             aiData.unit ? String(aiData.unit).substring(0, 30) : null,
    unit_price:       typeof aiData.unit_price === 'number' && isFinite(aiData.unit_price) ? Math.round(aiData.unit_price) : null,
    flat_amount:      typeof aiData.flat_amount === 'number' && isFinite(aiData.flat_amount) ? Math.round(aiData.flat_amount) : null,
    notes:            aiData.notes ? String(aiData.notes).substring(0, 300) : null,
  };
  if (!entry.work_description) return Response.json({ error: 'Nem sikerült értelmezni a tételt' }, { status: 422 });

  return Response.json({ entry });
}

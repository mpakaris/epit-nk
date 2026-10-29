import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request, { params }) {
  const { id: surveyId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: survey } = await admin.from('surveys')
    .select('owner_id, created_by, collective_id').eq('id', surveyId).single();
  if (!survey) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'superadmin') {
    const isOwner = survey.owner_id === user.id || survey.created_by === user.id;
    if (!isOwner) {
      if (survey.collective_id) {
        const { data: mem } = await admin.from('collective_members')
          .select('collective_id').eq('collective_id', survey.collective_id)
          .eq('user_id', user.id).eq('status', 'active').maybeSingle();
        if (!mem) return Response.json({ error: 'Forbidden' }, { status: 403 });
      } else {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
  }

  const { imageUrl } = await request.json();
  if (!imageUrl) return Response.json({ error: 'imageUrl required' }, { status: 400 });

  const apiKey = process.env.OPEN_AI_OCR_KEY;
  if (!apiKey) return Response.json({ error: 'OpenAI key not configured' }, { status: 500 });

  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert at reading architectural floor plans.
Identify every distinct room or space. For each extract:
- name: Hungarian room name (Nappali, Konyha, Hálószoba, Fürdőszoba, WC, Előtér, Előszoba, Gardrób, Terasz, Erkély, Garázs, Tároló, Dolgozószoba, Étkező, Közlekedő, Lépcső stb.)
- width_m: narrower dimension in meters — null if not annotated
- length_m: longer dimension in meters — null if not annotated
- size_m2: floor area in m² if annotated directly (e.g. "12.4 m²" or "12.4 nm") — null if not shown. If width and length are both present, do NOT calculate this; leave it null.
- door_count: integer, number of door symbols (arc/swing indicators) entering this room
- window_count: integer, number of window symbols (parallel lines in wall gaps) in this room

Rules: convert cm/mm to meters. Never estimate — only return values clearly marked on the plan.

Respond ONLY with valid JSON: { "rooms": [ { "name": "...", "width_m": 3.5, "length_m": 4.2, "size_m2": null, "door_count": 1, "window_count": 2 } ] }`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this floor plan and extract all rooms.' },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      temperature: 0,
    }),
  });

  const aiData = await aiRes.json();
  if (!aiRes.ok) {
    console.error('OpenAI analyze-layout error:', aiData);
    return Response.json({ error: 'Az AI nem tudta elemezni az alaprajzot.' }, { status: 500 });
  }

  const content = aiData.choices?.[0]?.message?.content ?? '';
  let parsed;
  try { parsed = JSON.parse(content); } catch {
    return Response.json({ error: 'Érvénytelen AI válasz.' }, { status: 500 });
  }

  const toM = v => typeof v === 'number' && isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null;
  const rooms = (Array.isArray(parsed?.rooms) ? parsed.rooms : [])
    .map(r => ({
      name:         String(r.name || '').trim().substring(0, 100),
      width_m:      toM(r.width_m),
      length_m:     toM(r.length_m),
      size_m2:      toM(r.size_m2),
      door_count:   typeof r.door_count   === 'number' ? Math.max(0, Math.round(r.door_count))   : 0,
      window_count: typeof r.window_count === 'number' ? Math.max(0, Math.round(r.window_count)) : 0,
    }))
    .filter(r => r.name);

  return Response.json({ rooms });
}

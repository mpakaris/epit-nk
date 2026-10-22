import { logOpenAiUsage, resolveModel } from './logAiUsage';

export async function classifyImage(imageBase64, mimeType, { phoneNumber, userId } = {}) {
  const apiKey = process.env.OPEN_AI_OCR_KEY;
  if (!apiKey) return 'unknown';

  try {
    const model = await resolveModel('classify_image').catch(() => 'gpt-4o');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Milyen típusú ez a kép? Válaszolj egyszóval.' },
          {
            role: 'user',
            content: [
              {
                type:      'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'low' },
              },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name:   'image_type',
            strict: true,
            schema: {
              type:                 'object',
              properties:           { type: { type: 'string', enum: ['invoice', 'construction_site', 'document', 'unknown'] } },
              required:             ['type'],
              additionalProperties: false,
            },
          },
        },
        max_completion_tokens:  50,
      }),
    });

    if (!res.ok) return 'unknown';
    const data = await res.json();
    const raw  = data.choices?.[0]?.message?.content;
    if (data.usage && phoneNumber) {
      logOpenAiUsage({ phoneNumber, userId, model, callType: 'classify_image', usage: data.usage })
        .catch(() => {});
    }
    return raw ? JSON.parse(raw).type : 'unknown';
  } catch {
    return 'unknown';
  }
}

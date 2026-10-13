import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

    const { imageBase64 } = await request.json();
    if (!imageBase64) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

    const apiKey = process.env.OPEN_AI_OCR_KEY;
    if (!apiKey) return NextResponse.json({ error: 'OpenAI key not configured' }, { status: 500 });

    const mimeType = imageBase64.startsWith('data:')
      ? imageBase64.split(';')[0].split(':')[1]
      : 'image/jpeg';
    const base64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are an expert at reading invoices and receipts from any country.

CURRENCY DETECTION:
- Detect the currency from the invoice (look for Ft, HUF, Forint, €, EUR, $, USD, etc.)
- Return the ISO currency code: "HUF", "EUR", "USD", etc.
- All monetary values must be in that detected currency — do NOT convert.

EXTRACTION RULES — read carefully:
- Only extract values that are CLEARLY and LEGIBLY printed on the invoice. Never guess, estimate, or calculate a value you cannot directly read.
- If a unit price is not printed (only a line total is shown), set unitPrice to 0.
- If a quantity is not printed, set quantity to 1.
- If a line total is not printed, set total to 0.
- grandTotal = the final amount to pay (look for: Végösszeg, Fizetendő, Összesen, Total, Total à payer, Gesamtbetrag, etc.) — only the brutto/gross/VAT-inclusive amount.
- Do NOT include VAT rows, discount rows, or subtotals as line items — only actual products or services.
- Do NOT invent or infer line items that are not on the invoice.

Hungarian invoice terms for reference:
- Megnevezés / Termék = item name
- Mennyiség / Menny. = quantity
- Egységár / Nettó egységár = unit price
- Összeg / Sor összeg / Bruttó = line total (prefer brutto)
- ÁFA / AFA = VAT (skip as line item)
- Fizetendő / Végösszeg = grand total`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all line items and the grand total from this invoice.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'invoice_analysis',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                currency: { type: 'string' },
                lineItems: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name:      { type: 'string' },
                      quantity:  { type: 'number' },
                      unitPrice: { type: 'number' },
                      total:     { type: 'number' },
                    },
                    required: ['name', 'quantity', 'unitPrice', 'total'],
                    additionalProperties: false,
                  },
                },
                grandTotal: { type: 'number' },
              },
              required: ['currency', 'lineItems', 'grandTotal'],
              additionalProperties: false,
            },
          },
        },
        max_tokens: 2000,
        temperature: 0,
      }),
    });

    const aiData = await response.json();

    if (!response.ok) {
      console.error('OpenAI error:', aiData);
      return NextResponse.json({ currency: 'HUF', lineItems: [], grandTotal: 0 });
    }

    const content = aiData.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(content);

    return NextResponse.json({
      currency: parsed.currency || 'HUF',
      lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
      grandTotal: Number(parsed.grandTotal) || 0,
    });
  } catch (err) {
    console.error('Invoice AI error:', err);
    return NextResponse.json({ currency: 'HUF', lineItems: [], grandTotal: 0 });
  }
}

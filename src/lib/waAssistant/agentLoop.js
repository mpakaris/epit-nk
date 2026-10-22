import { logOpenAiUsage } from './logAiUsage';
import { logAiCall } from './logAiCall';

const MAX_ITERATIONS = 5;
const FALLBACK_MODEL = 'gpt-4o';

export async function runAgentTurn({
  systemPrompt,
  conversationHistory,
  userMessage,
  tools,
  toolExecutors,
  phoneNumber,
  userId,
  waMessageId = null,
  mediaType   = null,   // 'text' | 'image/jpeg' | 'audio/ogg' | 'video/mp4' | 'application/pdf'
}) {
  const apiKey = process.env.OPEN_AI_OCR_KEY;
  if (!apiKey) return { reply: 'AI konfigurációs hiba — nincs API kulcs.' };

  const startedAt = Date.now();
  const messages  = [
    ...(conversationHistory || []),
    { role: 'user', content: userMessage },
  ];

  const auditToolCalls = [];
  let   totalTokensIn  = 0;
  let   totalTokensOut = 0;
  let   finalReply     = null;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let res;
    try {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model:    FALLBACK_MODEL,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          tools:    tools?.length ? tools : undefined,
          max_completion_tokens: 4096,
        }),
      });
    } catch (err) {
      console.error('[agentLoop] fetch error:', err.message);
      finalReply = 'Hálózati hiba — kérlek próbáld újra.';
      break;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[agentLoop] OpenAI error:', res.status, body.slice(0, 200));
      finalReply = 'Sajnos nem sikerült feldolgozni a kérést. Próbáld újra.';
      break;
    }

    const data   = await res.json();
    const choice = data.choices?.[0];

    if (data.usage) {
      totalTokensIn  += data.usage.prompt_tokens     || 0;
      totalTokensOut += data.usage.completion_tokens || 0;
      logOpenAiUsage({ phoneNumber, userId, model: FALLBACK_MODEL, callType: 'agent', usage: data.usage })
        .catch(() => {});
    }

    // No tool calls — final reply
    if (!choice?.message?.tool_calls?.length) {
      finalReply = choice?.message?.content?.trim() || 'Sajnos nem kaptam választ az AI-tól.';
      break;
    }

    // Execute tool calls
    messages.push(choice.message);

    for (const tc of choice.message.tool_calls) {
      const fn = tc.function.name;

      let args;
      try {
        args = JSON.parse(tc.function.arguments || '{}');
      } catch (parseErr) {
        console.error(`[agentLoop] tool args truncated for ${fn}:`, parseErr.message);
        finalReply = 'Az üzenet túl hosszú volt a feldolgozáshoz. Kérlek küld rövidebb részletekben (pl. fejezetenként).';
        break;
      }
      console.log(`[agentLoop] tool: ${fn}`, JSON.stringify(args).slice(0, 120));

      let result;
      try {
        const executor = toolExecutors?.[fn];
        result = executor
          ? await executor(args)
          : { success: false, error: `Ismeretlen eszköz: ${fn}` };
      } catch (err) {
        console.error(`[agentLoop] tool error (${fn}):`, err.message);
        result = { success: false, error: err.message };
      }

      console.log(`[agentLoop] tool result: ${fn}`, JSON.stringify(result).slice(0, 120));

      // Audit: store a sanitised summary (drop large blobs like note text)
      auditToolCalls.push({
        name:          fn,
        args_summary:  JSON.stringify(args).slice(0, 300),
        result_summary: JSON.stringify(result).slice(0, 300),
        success:       result?.success ?? true,
      });

      messages.push({
        role:         'tool',
        tool_call_id: tc.id,
        content:      JSON.stringify(result),
      });
    }

    if (finalReply) break;
  }

  if (!finalReply) {
    finalReply = 'A kérés feldolgozása megszakadt — kérlek fogalmazd át egyszerűbben.';
  }

  // Fire-and-forget audit log
  logAiCall({
    phoneNumber,
    waMessageId,
    provider:    'openai',
    callType:    'agent',
    model:       FALLBACK_MODEL,
    mediaType:   mediaType || 'text',
    userInput:   userMessage,
    aiInput:     {
      history_messages: (conversationHistory || []).length,
      tools_available:  tools?.length || 0,
    },
    toolCalls:   auditToolCalls.length ? auditToolCalls : null,
    aiOutput:    finalReply,
    tokensIn:    totalTokensIn  || null,
    tokensOut:   totalTokensOut || null,
    durationMs:  Date.now() - startedAt,
  });

  return { reply: finalReply };
}

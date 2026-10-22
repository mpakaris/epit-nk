-- Switch ALL OpenAI tasks to gpt-6-luna
-- Luna supports images → replaces gpt-4o for vision tasks too (25x cheaper)
-- Luna cached input = $0.01/1M vs gpt-4.1-nano $0.025/1M — wins on repeated system prompts

-- Text tasks (intent classification)
UPDATE public.wa_ai_rates
SET model = 'gpt-6-luna', cost_usd = 0.0000001000,
    notes = '$0.10 / 1M input tokens (gpt-6-luna)'
WHERE provider = 'openai' AND metric = 'input_tokens';

UPDATE public.wa_ai_rates
SET model = 'gpt-6-luna', cost_usd = 0.0000005000,
    notes = '$0.50 / 1M output tokens (gpt-6-luna)'
WHERE provider = 'openai' AND metric = 'output_tokens';

-- Vision tasks (image classify, invoice OCR) — Luna supports images, replaces gpt-4o
UPDATE public.wa_ai_rates
SET model = 'gpt-6-luna', cost_usd = 0.0000001000,
    notes = '$0.10 / 1M input tokens vision (gpt-6-luna)'
WHERE provider = 'openai' AND metric = 'input_tokens_vision';

UPDATE public.wa_ai_rates
SET model = 'gpt-6-luna', cost_usd = 0.0000005000,
    notes = '$0.50 / 1M output tokens vision (gpt-6-luna)'
WHERE provider = 'openai' AND metric = 'output_tokens_vision';

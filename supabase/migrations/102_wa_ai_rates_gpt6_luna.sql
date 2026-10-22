-- Switch text intent classification to gpt-6-luna ($0.10/$0.50 per 1M — cheapest available)
UPDATE public.wa_ai_rates
SET
  model    = 'gpt-6-luna',
  cost_usd = 0.0000001000,
  notes    = '$0.10 / 1M input tokens (gpt-6-luna)'
WHERE provider = 'openai' AND metric = 'input_tokens';

UPDATE public.wa_ai_rates
SET
  model    = 'gpt-6-luna',
  cost_usd = 0.0000005000,
  notes    = '$0.50 / 1M output tokens (gpt-6-luna)'
WHERE provider = 'openai' AND metric = 'output_tokens';

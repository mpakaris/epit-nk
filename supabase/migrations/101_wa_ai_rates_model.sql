-- Add model column to wa_ai_rates so superadmin can change models without a deploy
ALTER TABLE public.wa_ai_rates
  ADD COLUMN IF NOT EXISTS model TEXT NOT NULL DEFAULT 'gpt-4o';

-- Set cheaper models for text-only tasks
UPDATE public.wa_ai_rates SET model = 'gpt-4o-mini'
  WHERE provider = 'openai' AND metric IN ('input_tokens', 'output_tokens');

-- Update costs to reflect gpt-4o-mini pricing ($0.15 in / $0.60 out per 1M)
UPDATE public.wa_ai_rates SET cost_usd = 0.0000001500, notes = '$0.15 / 1M input tokens (gpt-4o-mini)'
  WHERE provider = 'openai' AND metric = 'input_tokens';

UPDATE public.wa_ai_rates SET cost_usd = 0.0000006000, notes = '$0.60 / 1M output tokens (gpt-4o-mini)'
  WHERE provider = 'openai' AND metric = 'output_tokens';

-- Add separate rows for gpt-4o vision tasks (images, OCR) — keep full model
INSERT INTO public.wa_ai_rates (provider, model, metric, cost_usd, notes) VALUES
  ('openai', 'gpt-4o', 'input_tokens_vision',  0.0000025000, '$2.50 / 1M input tokens (gpt-4o vision)'),
  ('openai', 'gpt-4o', 'output_tokens_vision',  0.0000100000, '$10.00 / 1M output tokens (gpt-4o vision)')
ON CONFLICT (provider, model, metric) DO NOTHING;

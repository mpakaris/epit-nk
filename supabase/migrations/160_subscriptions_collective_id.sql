-- Migration 160: add collective_id to subscriptions table + allow 'addon' product_family
-- Required by: cancel route fallback — links addon subscription rows to their collective
-- so the cancel route can look up the real Creem subscription ID when the collective
-- has a stale checkout ID stored.

-- Allow addon subscriptions to be stored alongside premium/bundle
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_product_family_check,
  ADD CONSTRAINT subscriptions_product_family_check
    CHECK (product_family = ANY (ARRAY['premium'::text, 'bundle'::text, 'addon'::text]));

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS collective_id UUID REFERENCES public.collectives(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS subscriptions_collective_id_idx
  ON public.subscriptions (collective_id)
  WHERE collective_id IS NOT NULL;

-- Backfill existing addon subscription rows that may already exist
UPDATE public.subscriptions s
SET collective_id = c.id
FROM public.collectives c
WHERE c.creem_subscription_id = s.creem_subscription_id
  AND s.product_family = 'addon'
  AND c.creem_subscription_id IS NOT NULL;

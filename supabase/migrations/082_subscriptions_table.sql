-- Migration 082: Premium subscriptions table
-- Replaces the creem_subscription_id + premium_period_end columns on profiles
-- with a proper subscriptions table. is_subscription_premium stays as a fast
-- boolean cache for permission checks (quotes, projects, surveys — unchanged).

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creem_subscription_id TEXT        UNIQUE,
  product_family        TEXT        NOT NULL DEFAULT 'premium'
                                    CHECK (product_family IN ('premium', 'bundle')),
  status                TEXT        NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('active', 'trialing', 'scheduled_cancel', 'canceled', 'paused', 'past_due', 'expired')),
  period_end            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_creem_sub_idx ON public.subscriptions(creem_subscription_id);

-- Migrate existing premium users who have a creem_subscription_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'premium_period_end'
  ) THEN
    INSERT INTO public.subscriptions (user_id, creem_subscription_id, product_family, status, period_end, created_at)
    SELECT
      id,
      creem_subscription_id,
      'premium',
      CASE WHEN premium_period_end IS NOT NULL THEN 'scheduled_cancel' ELSE 'active' END,
      premium_period_end,
      NOW()
    FROM public.profiles
    WHERE is_subscription_premium = TRUE
      AND creem_subscription_id IS NOT NULL
    ON CONFLICT (creem_subscription_id) DO NOTHING;
  ELSE
    INSERT INTO public.subscriptions (user_id, creem_subscription_id, product_family, status, created_at)
    SELECT
      id,
      creem_subscription_id,
      'premium',
      'active',
      NOW()
    FROM public.profiles
    WHERE is_subscription_premium = TRUE
      AND creem_subscription_id IS NOT NULL
    ON CONFLICT (creem_subscription_id) DO NOTHING;
  END IF;
END $$;

-- Drop columns now moved to subscriptions
ALTER TABLE public.profiles DROP COLUMN IF EXISTS creem_subscription_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS premium_period_end;

-- Migration 076: Subscription tiers, trial tracking, and pricing config

-- 1. Add tier/trial columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier  TEXT        NOT NULL DEFAULT 'basic'
    CHECK (subscription_tier IN ('basic', 'trial', 'premium')),
  ADD COLUMN IF NOT EXISTS trial_started_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at      TIMESTAMPTZ;

-- 2. Email-level trial ledger — prevents re-registration to reset the trial
CREATE TABLE IF NOT EXISTS public.trial_emails (
  email            TEXT        PRIMARY KEY,
  user_id          UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Admin-editable pricing / limit config
CREATE TABLE IF NOT EXISTS public.pricing_config (
  key        TEXT    PRIMARY KEY,
  value      NUMERIC NOT NULL,
  label      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.pricing_config (key, value, label) VALUES
  ('premium_monthly_huf', 6999, 'Prémium előfizetés (Ft/hó)'),
  ('seat_monthly_huf',    1999, 'Kollektíva szék (Ft/szék/hó)'),
  ('basic_max_surveys',      5, 'Bázis: max felmérések száma'),
  ('basic_max_quotes',       5, 'Bázis: max ajánlatok száma'),
  ('basic_max_projects',     1, 'Bázis: max projektek száma'),
  ('trial_days',            14, 'Ingyenes próbaidő (nap)')
ON CONFLICT (key) DO NOTHING;

-- 4. Updated handle_new_user:
--    - First-time email → 14-day trial
--    - Re-registration with same email → basic (no new trial)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_display_name      TEXT;
  v_role              TEXT;
  v_collective_id     UUID;
  v_gdpr_consented_at TIMESTAMPTZ;
  v_trial_days        INTEGER;
  v_gets_trial        BOOLEAN;
BEGIN
  v_display_name      := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
  v_role              := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  v_collective_id     := NULLIF(NEW.raw_user_meta_data->>'collective_id', '')::UUID;
  v_gdpr_consented_at := NULLIF(NEW.raw_user_meta_data->>'gdpr_consented_at', '')::TIMESTAMPTZ;

  SELECT value::INTEGER INTO v_trial_days FROM public.pricing_config WHERE key = 'trial_days';
  v_trial_days := COALESCE(v_trial_days, 14);

  -- Claim the email slot; conflict = email was used before → no trial
  INSERT INTO public.trial_emails (email, user_id, trial_started_at)
  VALUES (NEW.email, NEW.id, NOW())
  ON CONFLICT (email) DO NOTHING;

  -- Trial applies only if we claimed the slot AND this is a regular user
  v_gets_trial := v_role = 'user' AND EXISTS (
    SELECT 1 FROM public.trial_emails WHERE email = NEW.email AND user_id = NEW.id
  );

  INSERT INTO public.profiles (
    id, display_name, role, email,
    must_change_password, gdpr_consented_at, active_collective_id,
    subscription_tier, trial_started_at, trial_ends_at
  )
  VALUES (
    NEW.id,
    v_display_name,
    v_role,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, TRUE),
    v_gdpr_consented_at,
    v_collective_id,
    CASE WHEN v_gets_trial THEN 'trial' ELSE 'basic' END,
    CASE WHEN v_gets_trial THEN NOW()                ELSE NULL END,
    CASE WHEN v_gets_trial THEN NOW() + (v_trial_days || ' days')::INTERVAL ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name         = EXCLUDED.display_name,
    role                 = EXCLUDED.role,
    email                = EXCLUDED.email,
    must_change_password = EXCLUDED.must_change_password,
    gdpr_consented_at    = COALESCE(profiles.gdpr_consented_at, EXCLUDED.gdpr_consented_at),
    active_collective_id = COALESCE(profiles.active_collective_id, EXCLUDED.active_collective_id);

  IF v_collective_id IS NOT NULL AND v_role != 'superadmin' THEN
    INSERT INTO public.collective_members (collective_id, user_id, role, status)
    VALUES (v_collective_id, NEW.id, 'contributor', 'active')
    ON CONFLICT (collective_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

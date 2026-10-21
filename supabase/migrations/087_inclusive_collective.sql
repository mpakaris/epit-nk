-- Migration 087: Inclusive collective — every effective Premium user gets 1 free bundled collective
-- Rules:
--   • is_inclusive = TRUE → permanent, non-deletable, max 3 total members (owner + 2)
--   • Created automatically for trial users by handle_new_user trigger
--   • Created lazily for existing premium users by GET /api/collectives
--   • Frozen (subscription_status = 'canceled') when premium/trial lapses

-- 1. Add column
ALTER TABLE public.collectives
  ADD COLUMN IF NOT EXISTS is_inclusive BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Mark existing trial-owned collectives (no Creem subscription) as inclusive.
--    These were created via the old "free trial collective" flow.
UPDATE public.collectives c
SET    is_inclusive = TRUE
WHERE  c.creem_subscription_id IS NULL
  AND  EXISTS (
    SELECT 1
    FROM   public.collective_members cm
    JOIN   public.profiles p ON p.id = cm.user_id
    WHERE  cm.collective_id = c.id
      AND  cm.role = 'owner'
      AND  cm.status = 'active'
      AND  p.subscription_tier = 'trial'
  );

-- 3. Update handle_new_user trigger: auto-create inclusive collective for new trial users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_display_name        TEXT;
  v_role                TEXT;
  v_collective_id       UUID;
  v_gdpr_consented_at   TIMESTAMPTZ;
  v_trial_days          INTEGER := 14;
  v_gets_trial          BOOLEAN := FALSE;
  v_inclusive_id        UUID;
BEGIN
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  v_role              := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  v_collective_id     := NULLIF(NEW.raw_user_meta_data->>'collective_id', '')::UUID;
  v_gdpr_consented_at := NULLIF(NEW.raw_user_meta_data->>'gdpr_consented_at', '')::TIMESTAMPTZ;

  BEGIN
    SELECT value::INTEGER INTO v_trial_days
    FROM public.pricing_config WHERE key = 'trial_days';
  EXCEPTION WHEN OTHERS THEN
    v_trial_days := 14;
  END;
  v_trial_days := COALESCE(v_trial_days, 14);

  -- Claim the email slot for trial tracking
  INSERT INTO public.trial_emails (email, user_id, trial_started_at)
  VALUES (NEW.email, NEW.id, NOW())
  ON CONFLICT (email) DO NOTHING;

  -- Trial applies only if we claimed the slot AND this is a regular user
  v_gets_trial := v_role = 'user' AND EXISTS (
    SELECT 1 FROM public.trial_emails WHERE email = NEW.email AND user_id = NEW.id
  );

  -- Insert profile AFTER trial_emails so no FK violation occurs
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
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, FALSE),
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

  -- Auto-create inclusive collective for trial users
  IF v_gets_trial THEN
    v_inclusive_id := gen_random_uuid();
    INSERT INTO public.collectives (id, name, is_inclusive, subscription_status)
    VALUES (v_inclusive_id, v_display_name || ' Csapata', TRUE, 'active');
    INSERT INTO public.collective_members (collective_id, user_id, role, status)
    VALUES (v_inclusive_id, NEW.id, 'owner', 'active');
  END IF;

  -- Join collective if invited via metadata link
  IF v_collective_id IS NOT NULL AND v_role != 'superadmin' THEN
    INSERT INTO public.collective_members (collective_id, user_id, role, status)
    VALUES (v_collective_id, NEW.id, 'contributor', 'active')
    ON CONFLICT (collective_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user failed for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

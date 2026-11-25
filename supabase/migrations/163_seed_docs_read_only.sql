-- Migration 163: Seed documents + read-only fields + grace period
-- Required by: US-01 (seed docs on registration), US-03 (downgrade write-lock), US-09 (seed cannot be deleted), US-19 (grace period)
-- Apply via Supabase SQL Editor before deploying any US-01+ code.

-- ── 1. is_seed + is_read_only on content tables ─────────────────────────────

ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS is_seed      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_read_only BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS is_seed      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_read_only BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_seed      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_read_only BOOLEAN NOT NULL DEFAULT false;

-- ── 2. Payment-failure grace period on profiles ──────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_grace_until TIMESTAMPTZ DEFAULT NULL;

-- ── 3. pricing_config — update Basic limits 5→1, add missing keys ───────────

-- Update existing Basic limits from 5 to 1
UPDATE public.pricing_config SET value = 1 WHERE key = 'basic_max_surveys';
UPDATE public.pricing_config SET value = 1 WHERE key = 'basic_max_quotes';
UPDATE public.pricing_config SET value = 1 WHERE key = 'basic_max_projects';

-- Remove deprecated seat_monthly_huf; replace with per-package pricing
DELETE FROM public.pricing_config WHERE key = 'seat_monthly_huf';

-- Upsert all missing config keys
INSERT INTO public.pricing_config (key, value, label) VALUES
  ('premium_monthly_huf',    7990,  'Prémium előfizetés (Ft/hó)'),
  ('collective_s_huf',       4500,  'S csomag — 3 együttműködő (Ft/hó)'),
  ('collective_m_huf',       9000,  'M csomag — 6 együttműködő (Ft/hó)'),
  ('collective_l_huf',       13500, 'L csomag — 9 együttműködő (Ft/hó)'),
  ('collective_s_seats',     3,     'S csomag: max együttműködők'),
  ('collective_m_seats',     6,     'M csomag: max együttműködők'),
  ('collective_l_seats',     9,     'L csomag: max együttműködők'),
  ('basic_max_sections',     10,    'Bázis: max szekció/dokumentum'),
  ('max_items_per_section',  100,   'Minden csomag: max tétel/szekció (biztonsági korlát)'),
  ('basic_max_photos',       3,     'Bázis: max fotó/szekció'),
  ('premium_max_photos',     20,    'Prémium: max fotó/szekció'),
  ('premium_max_videos',     5,     'Prémium: max videó/szekció'),
  ('basic_photo_size_mb',    5,     'Bázis: max fotó mérete (MB)'),
  ('premium_photo_size_mb',  10,    'Prémium: max fotó mérete (MB)'),
  ('premium_video_size_mb',  50,    'Prémium: max videó mérete (MB)'),
  ('payment_grace_days',     5,     'Fizetési hiba türelmi idő (nap)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, label = EXCLUDED.label;

-- ── 4. handle_new_user — create 3 seed documents on every new registration ──
-- Seed docs are created for all new users (personal workspace).
-- Collective seed docs are created only for trial users (who get an inclusive collective).

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

  -- Create seed documents in personal workspace (all new regular users)
  IF v_role = 'user' THEN
    INSERT INTO public.surveys (owner_id, collective_id, title, is_seed, created_by)
    VALUES (NEW.id, NULL, 'Minta felmérés', TRUE, NEW.id);

    INSERT INTO public.quotes (owner_id, collective_id, title, status, is_seed, created_by)
    VALUES (NEW.id, NULL, 'Minta ajánlat', 'draft', TRUE, NEW.id);

    INSERT INTO public.projects (owner_id, collective_id, name, is_seed, created_by)
    VALUES (NEW.id, NULL, 'Minta projekt', TRUE, NEW.id);
  END IF;

  -- Auto-create inclusive collective for trial users
  IF v_gets_trial THEN
    v_inclusive_id := gen_random_uuid();
    INSERT INTO public.collectives (id, name, is_inclusive, status, collective_tier, subscription_status)
    VALUES (v_inclusive_id, v_display_name || ' Csapata', TRUE, 'active', 'xs', 'active');
    INSERT INTO public.collective_members (collective_id, user_id, role, status)
    VALUES (v_inclusive_id, NEW.id, 'owner', 'active');

    -- Create seed documents in the inclusive collective workspace
    INSERT INTO public.surveys (owner_id, collective_id, title, is_seed, created_by)
    VALUES (NEW.id, v_inclusive_id, 'Minta felmérés', TRUE, NEW.id);

    INSERT INTO public.quotes (owner_id, collective_id, title, status, is_seed, created_by)
    VALUES (NEW.id, v_inclusive_id, 'Minta ajánlat', 'draft', TRUE, NEW.id);

    INSERT INTO public.projects (owner_id, collective_id, name, is_seed, created_by)
    VALUES (NEW.id, v_inclusive_id, 'Minta projekt', TRUE, NEW.id);
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

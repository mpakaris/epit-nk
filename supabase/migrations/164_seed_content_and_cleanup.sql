-- Migration 164: Seed doc example content + DB cleanup
-- Apply via Supabase SQL Editor before deploying any seed-content code.

-- ── 1. Remove deprecated collective columns (safe — not referenced in code) ──

ALTER TABLE public.collectives
  DROP COLUMN IF EXISTS subscription_type,
  DROP COLUMN IF EXISTS seat_count;

-- ── 2. Update handle_new_user: add example sections/entries to seed docs ─────
-- Existing seed docs (created by migration 163) have no content.
-- New registrations via the updated trigger will get pre-populated content.
-- Existing seed docs remain empty; this only affects NEW registrations.

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
  v_survey_id           UUID;
  v_quote_id            UUID;
  v_project_id          UUID;
  v_inc_survey_id       UUID;
  v_inc_quote_id        UUID;
  v_inc_project_id      UUID;
  v_section_id          UUID;
  v_entry_id            UUID;
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

  -- Create seed documents with example content in personal workspace
  IF v_role = 'user' THEN
    -- Survey seed
    INSERT INTO public.surveys (owner_id, collective_id, title, is_seed, created_by)
    VALUES (NEW.id, NULL, 'Minta felmérés', TRUE, NEW.id)
    RETURNING id INTO v_survey_id;

    INSERT INTO public.survey_entries (survey_id, room_name, sort_order)
    VALUES (v_survey_id, 'Nappali', 0) RETURNING id INTO v_entry_id;
    INSERT INTO public.survey_entries (survey_id, room_name, sort_order)
    VALUES (v_survey_id, 'Konyha', 1);

    -- Quote seed
    INSERT INTO public.quotes (owner_id, collective_id, title, status, is_seed, created_by)
    VALUES (NEW.id, NULL, 'Minta ajánlat', 'draft', TRUE, NEW.id)
    RETURNING id INTO v_quote_id;

    INSERT INTO public.quote_sections (quote_id, title, sort_order)
    VALUES (v_quote_id, 'Anyagok', 0) RETURNING id INTO v_section_id;
    INSERT INTO public.quote_entries (quote_id, section_id, work_description, entry_type, quantity, unit, unit_price, sort_order)
    VALUES (v_quote_id, v_section_id, 'Villanyszerelési anyagok', 'material', 1, 'tétel', 25000, 0);
    INSERT INTO public.quote_entries (quote_id, section_id, work_description, entry_type, quantity, unit, unit_price, sort_order)
    VALUES (v_quote_id, v_section_id, 'Festék és alapozó', 'material', 2, 'vödör', 8500, 1);

    INSERT INTO public.quote_sections (quote_id, title, sort_order)
    VALUES (v_quote_id, 'Munkadíj', 1) RETURNING id INTO v_section_id;
    INSERT INTO public.quote_entries (quote_id, section_id, work_description, entry_type, quantity, unit, unit_price, sort_order)
    VALUES (v_quote_id, v_section_id, 'Bontás és előkészítés', 'labour', 8, 'óra', 6500, 0);

    -- Project seed
    INSERT INTO public.projects (owner_id, collective_id, name, is_seed, created_by)
    VALUES (NEW.id, NULL, 'Minta projekt', TRUE, NEW.id)
    RETURNING id INTO v_project_id;
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
    VALUES (NEW.id, v_inclusive_id, 'Minta felmérés', TRUE, NEW.id)
    RETURNING id INTO v_inc_survey_id;

    INSERT INTO public.survey_entries (survey_id, room_name, sort_order)
    VALUES (v_inc_survey_id, 'Nappali', 0);
    INSERT INTO public.survey_entries (survey_id, room_name, sort_order)
    VALUES (v_inc_survey_id, 'Konyha', 1);

    INSERT INTO public.quotes (owner_id, collective_id, title, status, is_seed, created_by)
    VALUES (NEW.id, v_inclusive_id, 'Minta ajánlat', 'draft', TRUE, NEW.id)
    RETURNING id INTO v_inc_quote_id;

    INSERT INTO public.quote_sections (quote_id, title, sort_order)
    VALUES (v_inc_quote_id, 'Anyagok', 0) RETURNING id INTO v_section_id;
    INSERT INTO public.quote_entries (quote_id, section_id, work_description, entry_type, quantity, unit, unit_price, sort_order)
    VALUES (v_inc_quote_id, v_section_id, 'Villanyszerelési anyagok', 'material', 1, 'tétel', 25000, 0);

    INSERT INTO public.quote_sections (quote_id, title, sort_order)
    VALUES (v_inc_quote_id, 'Munkadíj', 1) RETURNING id INTO v_section_id;
    INSERT INTO public.quote_entries (quote_id, section_id, work_description, entry_type, quantity, unit, unit_price, sort_order)
    VALUES (v_inc_quote_id, v_section_id, 'Bontás és előkészítés', 'labour', 8, 'óra', 6500, 0);

    INSERT INTO public.projects (owner_id, collective_id, name, is_seed, created_by)
    VALUES (NEW.id, v_inclusive_id, 'Minta projekt', TRUE, NEW.id)
    RETURNING id INTO v_inc_project_id;
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

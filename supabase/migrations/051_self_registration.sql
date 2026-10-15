-- Migration 051: Self-registration support
-- Adds gdpr_consented_at to profiles and updates handle_new_user trigger

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gdpr_consented_at TIMESTAMPTZ;

-- Update handle_new_user to store GDPR consent timestamp from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_display_name       TEXT;
  v_role               TEXT;
  v_entity_id          UUID;
  v_personal_entity_id UUID;
  v_gdpr_consented_at  TIMESTAMPTZ;
BEGIN
  v_display_name      := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
  v_role              := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  v_entity_id         := NULLIF(NEW.raw_user_meta_data->>'entity_id', '')::UUID;
  v_gdpr_consented_at := NULLIF(NEW.raw_user_meta_data->>'gdpr_consented_at', '')::TIMESTAMPTZ;

  -- 1. Upsert profile
  INSERT INTO public.profiles (id, display_name, role, entity_id, email, must_change_password, gdpr_consented_at)
  VALUES (
    NEW.id,
    v_display_name,
    v_role,
    v_entity_id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, TRUE),
    v_gdpr_consented_at
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name         = EXCLUDED.display_name,
    role                 = EXCLUDED.role,
    entity_id            = EXCLUDED.entity_id,
    email                = EXCLUDED.email,
    must_change_password = EXCLUDED.must_change_password,
    gdpr_consented_at    = COALESCE(profiles.gdpr_consented_at, EXCLUDED.gdpr_consented_at);

  -- Superadmin gets no personal entity
  IF v_role = 'superadmin' THEN
    RETURN NEW;
  END IF;

  -- 2. Create personal entity for this user
  INSERT INTO public.entities (name, type)
  VALUES (v_display_name || ' – Személyes', 'personal')
  RETURNING id INTO v_personal_entity_id;

  -- 3. Personal membership (owner)
  INSERT INTO public.memberships (user_id, entity_id, role, status)
  VALUES (NEW.id, v_personal_entity_id, 'owner', 'active')
  ON CONFLICT (user_id, entity_id) DO NOTHING;

  -- 4. Collective membership (if assigned to an entity at creation by admin)
  IF v_entity_id IS NOT NULL THEN
    INSERT INTO public.memberships (user_id, entity_id, role, status)
    VALUES (
      NEW.id,
      v_entity_id,
      CASE WHEN v_role = 'admin' THEN 'admin' ELSE 'member' END,
      'active'
    )
    ON CONFLICT (user_id, entity_id) DO NOTHING;

    UPDATE public.profiles SET current_entity_id = v_entity_id WHERE id = NEW.id;
  ELSE
    -- Self-registered user: personal entity is their primary entity
    UPDATE public.profiles
    SET current_entity_id = v_personal_entity_id,
        entity_id = v_personal_entity_id
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

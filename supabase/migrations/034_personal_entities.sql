-- Migration 034: Personal entities for all non-superadmin users
--
-- Two parts:
--   1. Backfill: create personal entity + membership for every existing non-SA user
--   2. Trigger: update handle_new_user so every new user automatically gets the same

-- ============================================================
-- 1. BACKFILL EXISTING USERS
--    Only touches users who don't yet have a personal-type entity membership.
--    Does NOT change current_entity_id — existing users keep their collective
--    as the active context; personal is available but not forced on them.
-- ============================================================
DO $$
DECLARE
  u RECORD;
  v_personal_entity_id UUID;
BEGIN
  FOR u IN
    SELECT p.id, p.display_name
    FROM public.profiles p
    WHERE p.role != 'superadmin'
      AND NOT EXISTS (
        SELECT 1
        FROM public.memberships m
        JOIN public.entities e ON e.id = m.entity_id
        WHERE m.user_id = p.id
          AND e.type = 'personal'
      )
  LOOP
    INSERT INTO public.entities (name, type)
    VALUES (u.display_name || ' – Személyes', 'personal')
    RETURNING id INTO v_personal_entity_id;

    INSERT INTO public.memberships (user_id, entity_id, role, status)
    VALUES (u.id, v_personal_entity_id, 'owner', 'active')
    ON CONFLICT (user_id, entity_id) DO NOTHING;
  END LOOP;
END;
$$;

-- ============================================================
-- 2. UPDATE TRIGGER FUNCTION
--    Replaces the function from migration 011.
--    Now also creates personal entity + membership and sets current_entity_id.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_display_name       TEXT;
  v_role               TEXT;
  v_entity_id          UUID;
  v_personal_entity_id UUID;
BEGIN
  v_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
  v_role         := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  v_entity_id    := NULLIF(NEW.raw_user_meta_data->>'entity_id', '')::UUID;

  -- 1. Upsert profile (same as before)
  INSERT INTO public.profiles (id, display_name, role, entity_id, email, must_change_password)
  VALUES (
    NEW.id,
    v_display_name,
    v_role,
    v_entity_id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, TRUE)
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name         = EXCLUDED.display_name,
    role                 = EXCLUDED.role,
    entity_id            = EXCLUDED.entity_id,
    email                = EXCLUDED.email,
    must_change_password = EXCLUDED.must_change_password;

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

  -- 4. Collective membership (if the user was assigned to an entity at creation)
  IF v_entity_id IS NOT NULL THEN
    INSERT INTO public.memberships (user_id, entity_id, role, status)
    VALUES (
      NEW.id,
      v_entity_id,
      CASE WHEN v_role = 'admin' THEN 'admin' ELSE 'member' END,
      'active'
    )
    ON CONFLICT (user_id, entity_id) DO NOTHING;

    -- Active context = collective (where shared work happens)
    UPDATE public.profiles SET current_entity_id = v_entity_id WHERE id = NEW.id;
  ELSE
    -- No collective yet: active context = personal
    UPDATE public.profiles SET current_entity_id = v_personal_entity_id WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

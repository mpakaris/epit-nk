-- ==============================================================================
-- Migration 005b — Initial tenant + user setup
-- Run AFTER 005_multi_tenant_fresh_start.sql
--
-- This script:
-- 1. Creates "Entity 1" (rename it after if needed)
-- 2. Inserts profiles for your 3 existing auth users
-- 3. Assigns roles and entity membership by email — no UUIDs needed
-- ==============================================================================

DO $$
DECLARE
  v_entity_id UUID;
BEGIN

  -- 1. Create Entity 1
  INSERT INTO public.entities (name)
  VALUES ('Entity 1')
  RETURNING id INTO v_entity_id;

  RAISE NOTICE 'Entity created with id: %', v_entity_id;

  -- 2. Insert profiles for the 3 existing auth users
  --    Uses email to resolve UUIDs — no manual UUID lookup needed.

  INSERT INTO public.profiles (id, display_name, role, entity_id, must_change_password)
  SELECT
    u.id,
    COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
    CASE
      WHEN u.email = 'nikos.mpakaris@gmail.com' THEN 'superadmin'
      ELSE 'admin'
    END AS role,
    CASE
      WHEN u.email = 'nikos.mpakaris@gmail.com' THEN NULL  -- superadmin has no entity
      ELSE v_entity_id
    END AS entity_id,
    FALSE  -- existing users skip the forced password change
  FROM auth.users u
  WHERE u.email IN (
    'admin@admin.com',
    'akimikodi@gmail.com',
    'nikos.mpakaris@gmail.com'
  )
  ON CONFLICT (id) DO UPDATE SET
    role                 = EXCLUDED.role,
    entity_id            = EXCLUDED.entity_id,
    must_change_password = EXCLUDED.must_change_password;

  RAISE NOTICE 'Profiles inserted/updated for 3 users.';

END $$;

-- Verify the result:
SELECT
  p.display_name,
  u.email,
  p.role,
  e.name AS entity_name,
  p.must_change_password
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN public.entities e ON e.id = p.entity_id
ORDER BY p.role;

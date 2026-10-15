-- ============================================================
-- Migration 052: Clean workspace model
-- ============================================================
-- FROM: entities (personal+collective), profiles.entity_id + current_entity_id
-- TO:   collectives (collective only), profiles.active_collective_id
--       projects/quotes/surveys: owner_id + collective_id (nullable)
--       clients: owner_id (always personal)
--
-- Old columns are KEPT here (dropped in 053 after smoke-testing).
-- All new columns are backfilled from existing data — zero data loss.
-- ============================================================

-- ── 1. collectives table ────────────────────────────────────────────────────
CREATE TABLE public.collectives (
  id         UUID PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.collectives (id, name, created_at)
SELECT id, name, COALESCE(created_at, NOW())
FROM   public.entities
WHERE  type = 'collective';

-- ── 2. collective_members ────────────────────────────────────────────────────
CREATE TABLE public.collective_members (
  collective_id UUID NOT NULL REFERENCES public.collectives(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id)    ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'contributor'
                  CHECK (role IN ('owner','admin','contributor')),
  auto_approve  BOOLEAN NOT NULL DEFAULT true,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('invited','active')),
  invited_by    UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (collective_id, user_id)
);

INSERT INTO public.collective_members (collective_id, user_id, role, status, created_at)
SELECT
  m.entity_id,
  m.user_id,
  CASE WHEN m.role IN ('owner','admin') THEN m.role ELSE 'contributor' END,
  COALESCE(m.status, 'active'),
  COALESCE(m.created_at, NOW())
FROM   public.memberships m
JOIN   public.entities    e ON e.id = m.entity_id AND e.type = 'collective'
ON CONFLICT (collective_id, user_id) DO NOTHING;

-- ── 3. profiles.active_collective_id ────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_collective_id UUID
    REFERENCES public.collectives(id) ON DELETE SET NULL;

-- Backfill: keep current context if it points to a collective
UPDATE public.profiles p
SET    active_collective_id = p.current_entity_id
FROM   public.entities e
WHERE  e.id = p.current_entity_id
  AND  e.type = 'collective';

-- ── 4. projects: owner_id + collective_id ───────────────────────────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS owner_id      UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS collective_id UUID REFERENCES public.collectives(id) ON DELETE SET NULL;

UPDATE public.projects p
SET
  owner_id      = COALESCE(p.created_by, (
    SELECT m.user_id FROM public.memberships m
    WHERE  m.entity_id = p.entity_id
      AND  m.role IN ('owner','admin')
      AND  m.status = 'active'
    LIMIT 1
  )),
  collective_id = CASE WHEN e.type = 'collective' THEN p.entity_id ELSE NULL END
FROM public.entities e
WHERE e.id = p.entity_id;

-- ── 5. quotes: owner_id + collective_id ─────────────────────────────────────
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS owner_id      UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS collective_id UUID REFERENCES public.collectives(id) ON DELETE SET NULL;

UPDATE public.quotes q
SET
  owner_id      = COALESCE(q.created_by, (
    SELECT m.user_id FROM public.memberships m
    WHERE  m.entity_id = q.entity_id
      AND  m.role IN ('owner','admin')
      AND  m.status = 'active'
    LIMIT 1
  )),
  collective_id = CASE WHEN e.type = 'collective' THEN q.entity_id ELSE NULL END
FROM public.entities e
WHERE e.id = q.entity_id;

-- ── 6. surveys: owner_id + collective_id ────────────────────────────────────
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS owner_id      UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS collective_id UUID REFERENCES public.collectives(id) ON DELETE SET NULL;

UPDATE public.surveys s
SET
  owner_id      = COALESCE(s.created_by, (
    SELECT m.user_id FROM public.memberships m
    WHERE  m.entity_id = s.entity_id
      AND  m.role IN ('owner','admin')
      AND  m.status = 'active'
    LIMIT 1
  )),
  collective_id = CASE WHEN e.type = 'collective' THEN s.entity_id ELSE NULL END
FROM public.entities e
WHERE e.id = s.entity_id;

-- ── 7. clients: owner_id (always personal) ──────────────────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id);

-- Clients in personal entities
UPDATE public.clients c
SET    owner_id = m.user_id
FROM   public.entities   e
JOIN   public.memberships m ON m.entity_id = e.id
                            AND m.role IN ('owner','admin')
                            AND m.status = 'active'
WHERE  e.id   = c.entity_id
  AND  e.type = 'personal';

-- Clients in collective entities → assign to collective owner
UPDATE public.clients c
SET    owner_id = cm.user_id
FROM   public.entities          e
JOIN   public.collective_members cm ON cm.collective_id = e.id AND cm.role = 'owner'
WHERE  e.id      = c.entity_id
  AND  e.type    = 'collective'
  AND  c.owner_id IS NULL;

-- ── 8. Updated handle_new_user trigger ──────────────────────────────────────
-- No more personal entity creation.
-- Admin-created users pass collective_id in metadata.
-- Self-registered users get active_collective_id = NULL.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_display_name      TEXT;
  v_role              TEXT;
  v_collective_id     UUID;
  v_gdpr_consented_at TIMESTAMPTZ;
BEGIN
  v_display_name      := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
  v_role              := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  v_collective_id     := NULLIF(NEW.raw_user_meta_data->>'collective_id', '')::UUID;
  v_gdpr_consented_at := NULLIF(NEW.raw_user_meta_data->>'gdpr_consented_at', '')::TIMESTAMPTZ;

  INSERT INTO public.profiles (
    id, display_name, role, email,
    must_change_password, gdpr_consented_at, active_collective_id
  )
  VALUES (
    NEW.id,
    v_display_name,
    v_role,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, TRUE),
    v_gdpr_consented_at,
    v_collective_id
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name          = EXCLUDED.display_name,
    role                  = EXCLUDED.role,
    email                 = EXCLUDED.email,
    must_change_password  = EXCLUDED.must_change_password,
    gdpr_consented_at     = COALESCE(profiles.gdpr_consented_at, EXCLUDED.gdpr_consented_at),
    active_collective_id  = COALESCE(profiles.active_collective_id, EXCLUDED.active_collective_id);

  -- Add to collective_members if assigned to a collective
  IF v_collective_id IS NOT NULL AND v_role != 'superadmin' THEN
    INSERT INTO public.collective_members (collective_id, user_id, role, status)
    VALUES (
      v_collective_id,
      NEW.id,
      CASE WHEN v_role = 'admin' THEN 'admin' ELSE 'contributor' END,
      'active'
    )
    ON CONFLICT (collective_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

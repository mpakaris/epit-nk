-- Migration 033: Memberships table for multi-context support
--
-- Strategy: purely additive. profiles.entity_id is kept as-is so all existing
-- API calls continue working during transition. memberships is the new source
-- of truth for "which entities can this user access". current_entity_id tracks
-- the user's active context for the context-switcher UI.

-- ============================================================
-- 1. ADD TYPE COLUMN TO ENTITIES
-- ============================================================
ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'collective'
  CHECK (type IN ('personal', 'collective'));

-- ============================================================
-- 2. MEMBERSHIPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.memberships (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_id   UUID        NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'member'
                          CHECK (role IN ('owner', 'admin', 'member')),
  status      TEXT        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'invited', 'suspended')),
  invited_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id   ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_entity_id ON public.memberships(entity_id);

-- ============================================================
-- 3. MIGRATE EXISTING PROFILE ENTITY RELATIONSHIPS
--    All current users who have entity_id become members of that entity.
--    Existing 'admin' role → 'admin', 'user' role → 'member'.
--    superadmin rows have entity_id = NULL, so they are excluded.
-- ============================================================
INSERT INTO public.memberships (user_id, entity_id, role, status)
SELECT
  id          AS user_id,
  entity_id,
  CASE WHEN role = 'admin' THEN 'admin' ELSE 'member' END AS role,
  'active'    AS status
FROM public.profiles
WHERE entity_id IS NOT NULL
  AND role != 'superadmin'
ON CONFLICT (user_id, entity_id) DO NOTHING;

-- ============================================================
-- 4. ADD CURRENT_ENTITY_ID TO PROFILES (context switcher state)
--    Default to existing entity_id so the UI works on day 1.
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL;

UPDATE public.profiles
SET current_entity_id = entity_id
WHERE entity_id IS NOT NULL
  AND current_entity_id IS NULL;

-- ============================================================
-- 5. RLS FOR MEMBERSHIPS
-- ============================================================
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Superadmin: full access
CREATE POLICY "memberships: superadmin all"
  ON public.memberships FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- Users can read their own memberships
CREATE POLICY "memberships: user reads own"
  ON public.memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Entity admins/owners can read all memberships within their entity
CREATE POLICY "memberships: entity admin reads entity"
  ON public.memberships FOR SELECT TO authenticated
  USING (
    entity_id IN (
      SELECT entity_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Entity admins/owners can manage (insert/update/delete) memberships in their entity
CREATE POLICY "memberships: entity admin manages"
  ON public.memberships FOR ALL TO authenticated
  USING (
    entity_id IN (
      SELECT entity_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  )
  WITH CHECK (
    entity_id IN (
      SELECT entity_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

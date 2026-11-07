-- Migration 137: Task 6b — RLS policies for top-level document tables
--
-- Covers: projects, quotes, surveys, clients
-- Prerequisite: migrations 134, 135, 136 must be applied first.
--
-- Access rules (mirror the application-level logic in CLAUDE.md):
--   Personal document:   owner_id = user AND collective_id IS NULL
--   Collective document: collective_id = X — all active members can SELECT;
--                        only owner/admin can INSERT/UPDATE/DELETE
--   Superadmin:          unrestricted
--   clients:             always personal (owner_id = user), never collective (GDPR)
--
-- NOTE: The app uses service_role for all data access and bypasses these policies.
-- These policies are defence-in-depth — they block direct REST API access via anon/JWT.
-- After migration 135 (REVOKE), direct access is already blocked at the privilege level;
-- these policies add an explicit, documented second layer.
--
-- Apply via Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ── projects ─────────────────────────────────────────────────────────────────────

-- Drop any existing non-deny-all policies first (clean slate)
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_superadmin()
      OR (owner_id = auth.uid() AND collective_id IS NULL)
      OR (collective_id IS NOT NULL AND is_collective_member(collective_id))
    )
  );

CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    is_superadmin()
    OR (owner_id = auth.uid() AND collective_id IS NULL)
    OR (collective_id IS NOT NULL AND is_collective_owner_or_admin(collective_id))
  );

CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_superadmin()
      OR (owner_id = auth.uid() AND collective_id IS NULL)
      OR (collective_id IS NOT NULL AND is_collective_owner_or_admin(collective_id))
    )
  );

CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE TO authenticated
  USING (
    is_superadmin()
    OR (owner_id = auth.uid() AND collective_id IS NULL)
    OR (collective_id IS NOT NULL AND is_collective_owner_or_admin(collective_id))
  );

-- ── quotes ───────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "quotes_select" ON public.quotes;
DROP POLICY IF EXISTS "quotes_insert" ON public.quotes;
DROP POLICY IF EXISTS "quotes_update" ON public.quotes;
DROP POLICY IF EXISTS "quotes_delete" ON public.quotes;

CREATE POLICY "quotes_select" ON public.quotes
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_superadmin()
      OR (owner_id = auth.uid() AND collective_id IS NULL)
      OR (collective_id IS NOT NULL AND is_collective_member(collective_id))
    )
  );

CREATE POLICY "quotes_insert" ON public.quotes
  FOR INSERT TO authenticated
  WITH CHECK (
    is_superadmin()
    OR (owner_id = auth.uid() AND collective_id IS NULL)
    OR (collective_id IS NOT NULL AND is_collective_owner_or_admin(collective_id))
  );

CREATE POLICY "quotes_update" ON public.quotes
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_superadmin()
      OR (owner_id = auth.uid() AND collective_id IS NULL)
      OR (collective_id IS NOT NULL AND is_collective_owner_or_admin(collective_id))
    )
  );

CREATE POLICY "quotes_delete" ON public.quotes
  FOR DELETE TO authenticated
  USING (
    is_superadmin()
    OR (owner_id = auth.uid() AND collective_id IS NULL)
    OR (collective_id IS NOT NULL AND is_collective_owner_or_admin(collective_id))
  );

-- ── surveys ──────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "surveys_select" ON public.surveys;
DROP POLICY IF EXISTS "surveys_insert" ON public.surveys;
DROP POLICY IF EXISTS "surveys_update" ON public.surveys;
DROP POLICY IF EXISTS "surveys_delete" ON public.surveys;

CREATE POLICY "surveys_select" ON public.surveys
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_superadmin()
      OR (owner_id = auth.uid() AND collective_id IS NULL)
      OR (collective_id IS NOT NULL AND is_collective_member(collective_id))
      -- shared_with array for cross-workspace survey templates
      OR auth.uid() = ANY(shared_with)
    )
  );

CREATE POLICY "surveys_insert" ON public.surveys
  FOR INSERT TO authenticated
  WITH CHECK (
    is_superadmin()
    OR (owner_id = auth.uid() AND collective_id IS NULL)
    OR (collective_id IS NOT NULL AND is_collective_owner_or_admin(collective_id))
  );

CREATE POLICY "surveys_update" ON public.surveys
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_superadmin()
      OR (owner_id = auth.uid() AND collective_id IS NULL)
      OR (collective_id IS NOT NULL AND is_collective_owner_or_admin(collective_id))
    )
  );

CREATE POLICY "surveys_delete" ON public.surveys
  FOR DELETE TO authenticated
  USING (
    is_superadmin()
    OR (owner_id = auth.uid() AND collective_id IS NULL)
    OR (collective_id IS NOT NULL AND is_collective_owner_or_admin(collective_id))
  );

-- ── clients (always personal — GDPR, never shared at the RLS level) ──────────────

DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "clients_delete" ON public.clients;

CREATE POLICY "clients_select" ON public.clients
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_superadmin()
      OR owner_id = auth.uid()
    )
  );

CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    is_superadmin()
    OR owner_id = auth.uid()
  );

CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_superadmin()
      OR owner_id = auth.uid()
    )
  );

CREATE POLICY "clients_delete" ON public.clients
  FOR DELETE TO authenticated
  USING (
    is_superadmin()
    OR owner_id = auth.uid()
  );

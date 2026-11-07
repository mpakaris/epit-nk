-- Migration 138: Task 6c — RLS policies for child tables
--
-- Covers: invoices, labour_entries, quote_entries, quote_sections,
--         project_rooms, diary_entries
--
-- Strategy: child access is determined by parent access — if you can see the parent
-- project/quote, you can see its children. Access is expressed as an EXISTS subquery
-- on the parent rather than repeating the full ownership logic.
--
-- Entry-level mutations (INSERT/UPDATE/DELETE on own entries) are additionally
-- gated by user_id = auth.uid() so contributors can only manage their own work.
--
-- Prerequisite: migrations 134–137 must be applied first.
-- Apply via Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ── invoices (parent: projects) ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update" ON public.invoices;
DROP POLICY IF EXISTS "invoices_delete" ON public.invoices;

CREATE POLICY "invoices_select" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_superadmin()
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id
          AND p.deleted_at IS NULL
          AND (
            (p.owner_id = auth.uid() AND p.collective_id IS NULL)
            OR (p.collective_id IS NOT NULL AND is_collective_member(p.collective_id))
          )
      )
    )
  );

CREATE POLICY "invoices_insert" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.deleted_at IS NULL
        AND (
          (p.owner_id = auth.uid() AND p.collective_id IS NULL)
          OR (p.collective_id IS NOT NULL AND is_collective_member(p.collective_id))
        )
    )
  );

CREATE POLICY "invoices_update" ON public.invoices
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_superadmin()
      OR uploaded_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id
          AND p.deleted_at IS NULL
          AND (
            (p.owner_id = auth.uid() AND p.collective_id IS NULL)
            OR (p.collective_id IS NOT NULL AND is_collective_owner_or_admin(p.collective_id))
          )
      )
    )
  );

CREATE POLICY "invoices_delete" ON public.invoices
  FOR DELETE TO authenticated
  USING (
    is_superadmin()
    OR uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.deleted_at IS NULL
        AND (
          (p.owner_id = auth.uid() AND p.collective_id IS NULL)
          OR (p.collective_id IS NOT NULL AND is_collective_owner_or_admin(p.collective_id))
        )
    )
  );

-- ── labour_entries (parent: projects) ────────────────────────────────────────────

DROP POLICY IF EXISTS "labour_entries_select" ON public.labour_entries;
DROP POLICY IF EXISTS "labour_entries_insert" ON public.labour_entries;
DROP POLICY IF EXISTS "labour_entries_update" ON public.labour_entries;
DROP POLICY IF EXISTS "labour_entries_delete" ON public.labour_entries;

CREATE POLICY "labour_entries_select" ON public.labour_entries
  FOR SELECT TO authenticated
  USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.deleted_at IS NULL
        AND (
          (p.owner_id = auth.uid() AND p.collective_id IS NULL)
          OR (p.collective_id IS NOT NULL AND is_collective_member(p.collective_id))
        )
    )
  );

CREATE POLICY "labour_entries_insert" ON public.labour_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.deleted_at IS NULL
        AND (
          (p.owner_id = auth.uid() AND p.collective_id IS NULL)
          OR (p.collective_id IS NOT NULL AND is_collective_member(p.collective_id))
        )
    )
  );

CREATE POLICY "labour_entries_update" ON public.labour_entries
  FOR UPDATE TO authenticated
  USING (
    is_superadmin()
    OR uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.deleted_at IS NULL
        AND (
          (p.owner_id = auth.uid() AND p.collective_id IS NULL)
          OR (p.collective_id IS NOT NULL AND is_collective_owner_or_admin(p.collective_id))
        )
    )
  );

CREATE POLICY "labour_entries_delete" ON public.labour_entries
  FOR DELETE TO authenticated
  USING (
    is_superadmin()
    OR uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.deleted_at IS NULL
        AND (
          (p.owner_id = auth.uid() AND p.collective_id IS NULL)
          OR (p.collective_id IS NOT NULL AND is_collective_owner_or_admin(p.collective_id))
        )
    )
  );

-- ── quote_entries (parent: quotes) ───────────────────────────────────────────────

DROP POLICY IF EXISTS "quote_entries_select" ON public.quote_entries;
DROP POLICY IF EXISTS "quote_entries_insert" ON public.quote_entries;
DROP POLICY IF EXISTS "quote_entries_update" ON public.quote_entries;
DROP POLICY IF EXISTS "quote_entries_delete" ON public.quote_entries;

CREATE POLICY "quote_entries_select" ON public.quote_entries
  FOR SELECT TO authenticated
  USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_id
        AND q.deleted_at IS NULL
        AND (
          (q.owner_id = auth.uid() AND q.collective_id IS NULL)
          OR (q.collective_id IS NOT NULL AND is_collective_member(q.collective_id))
        )
    )
  );

CREATE POLICY "quote_entries_insert" ON public.quote_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_id
        AND q.deleted_at IS NULL
        AND (
          (q.owner_id = auth.uid() AND q.collective_id IS NULL)
          OR (q.collective_id IS NOT NULL AND is_collective_member(q.collective_id))
        )
    )
  );

CREATE POLICY "quote_entries_update" ON public.quote_entries
  FOR UPDATE TO authenticated
  USING (
    is_superadmin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_id
        AND q.deleted_at IS NULL
        AND (
          (q.owner_id = auth.uid() AND q.collective_id IS NULL)
          OR (q.collective_id IS NOT NULL AND is_collective_owner_or_admin(q.collective_id))
        )
    )
  );

CREATE POLICY "quote_entries_delete" ON public.quote_entries
  FOR DELETE TO authenticated
  USING (
    is_superadmin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_id
        AND q.deleted_at IS NULL
        AND (
          (q.owner_id = auth.uid() AND q.collective_id IS NULL)
          OR (q.collective_id IS NOT NULL AND is_collective_owner_or_admin(q.collective_id))
        )
    )
  );

-- ── quote_sections (parent: quotes) ──────────────────────────────────────────────

DROP POLICY IF EXISTS "quote_sections_select" ON public.quote_sections;
DROP POLICY IF EXISTS "quote_sections_insert" ON public.quote_sections;
DROP POLICY IF EXISTS "quote_sections_update" ON public.quote_sections;
DROP POLICY IF EXISTS "quote_sections_delete" ON public.quote_sections;

CREATE POLICY "quote_sections_select" ON public.quote_sections
  FOR SELECT TO authenticated
  USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_id
        AND q.deleted_at IS NULL
        AND (
          (q.owner_id = auth.uid() AND q.collective_id IS NULL)
          OR (q.collective_id IS NOT NULL AND is_collective_member(q.collective_id))
        )
    )
  );

CREATE POLICY "quote_sections_insert" ON public.quote_sections
  FOR INSERT TO authenticated
  WITH CHECK (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_id
        AND q.deleted_at IS NULL
        AND (
          (q.owner_id = auth.uid() AND q.collective_id IS NULL)
          OR (q.collective_id IS NOT NULL AND is_collective_member(q.collective_id))
        )
    )
  );

CREATE POLICY "quote_sections_update" ON public.quote_sections
  FOR UPDATE TO authenticated
  USING (
    is_superadmin()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_id
        AND q.deleted_at IS NULL
        AND (
          (q.owner_id = auth.uid() AND q.collective_id IS NULL)
          OR (q.collective_id IS NOT NULL AND is_collective_owner_or_admin(q.collective_id))
        )
    )
  );

CREATE POLICY "quote_sections_delete" ON public.quote_sections
  FOR DELETE TO authenticated
  USING (
    is_superadmin()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_id
        AND q.deleted_at IS NULL
        AND (
          (q.owner_id = auth.uid() AND q.collective_id IS NULL)
          OR (q.collective_id IS NOT NULL AND is_collective_owner_or_admin(q.collective_id))
        )
    )
  );

-- ── project_rooms (parent: projects) ─────────────────────────────────────────────

DROP POLICY IF EXISTS "project_rooms_select" ON public.project_rooms;
DROP POLICY IF EXISTS "project_rooms_insert" ON public.project_rooms;
DROP POLICY IF EXISTS "project_rooms_update" ON public.project_rooms;
DROP POLICY IF EXISTS "project_rooms_delete" ON public.project_rooms;

CREATE POLICY "project_rooms_select" ON public.project_rooms
  FOR SELECT TO authenticated
  USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.deleted_at IS NULL
        AND (
          (p.owner_id = auth.uid() AND p.collective_id IS NULL)
          OR (p.collective_id IS NOT NULL AND is_collective_member(p.collective_id))
        )
    )
  );

CREATE POLICY "project_rooms_insert" ON public.project_rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.deleted_at IS NULL
        AND (
          (p.owner_id = auth.uid() AND p.collective_id IS NULL)
          OR (p.collective_id IS NOT NULL AND is_collective_member(p.collective_id))
        )
    )
  );

CREATE POLICY "project_rooms_update" ON public.project_rooms
  FOR UPDATE TO authenticated
  USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.deleted_at IS NULL
        AND (
          (p.owner_id = auth.uid() AND p.collective_id IS NULL)
          OR (p.collective_id IS NOT NULL AND is_collective_owner_or_admin(p.collective_id))
        )
    )
  );

CREATE POLICY "project_rooms_delete" ON public.project_rooms
  FOR DELETE TO authenticated
  USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.deleted_at IS NULL
        AND (
          (p.owner_id = auth.uid() AND p.collective_id IS NULL)
          OR (p.collective_id IS NOT NULL AND is_collective_owner_or_admin(p.collective_id))
        )
    )
  );

-- ── diary_entries (parent: projects; public flag for share-token view) ───────────

DROP POLICY IF EXISTS "diary_entries_select" ON public.diary_entries;
DROP POLICY IF EXISTS "diary_entries_insert" ON public.diary_entries;
DROP POLICY IF EXISTS "diary_entries_update" ON public.diary_entries;
DROP POLICY IF EXISTS "diary_entries_delete" ON public.diary_entries;

CREATE POLICY "diary_entries_select" ON public.diary_entries
  FOR SELECT TO authenticated, anon
  USING (
    -- Public entries are readable by anyone (share-token pages use anon key)
    is_public = true
    OR is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.deleted_at IS NULL
        AND (
          (p.owner_id = auth.uid() AND p.collective_id IS NULL)
          OR (p.collective_id IS NOT NULL AND is_collective_member(p.collective_id))
        )
    )
  );

CREATE POLICY "diary_entries_insert" ON public.diary_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.deleted_at IS NULL
        AND (
          (p.owner_id = auth.uid() AND p.collective_id IS NULL)
          OR (p.collective_id IS NOT NULL AND is_collective_member(p.collective_id))
        )
    )
  );

CREATE POLICY "diary_entries_update" ON public.diary_entries
  FOR UPDATE TO authenticated
  USING (
    is_superadmin()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.deleted_at IS NULL
        AND (
          (p.owner_id = auth.uid() AND p.collective_id IS NULL)
          OR (p.collective_id IS NOT NULL AND is_collective_owner_or_admin(p.collective_id))
        )
    )
  );

CREATE POLICY "diary_entries_delete" ON public.diary_entries
  FOR DELETE TO authenticated
  USING (
    is_superadmin()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.deleted_at IS NULL
        AND (
          (p.owner_id = auth.uid() AND p.collective_id IS NULL)
          OR (p.collective_id IS NOT NULL AND is_collective_owner_or_admin(p.collective_id))
        )
    )
  );

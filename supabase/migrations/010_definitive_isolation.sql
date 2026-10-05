-- ==============================================================================
-- Migration 010 — Definitive isolation
-- Safe to re-run. Drops every known old policy, then creates correct ones.
-- Run in: Supabase Dashboard → SQL Editor → Run
-- ==============================================================================

-- ── 1. Fix is_admin() to include superadmin ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  );
$$;

-- ── 2. PROFILES ───────────────────────────────────────────────────────────────
-- Members can see all profiles in their own entity (needed for invite lists)
DROP POLICY IF EXISTS "Profiles: view own or admin"              ON public.profiles;
DROP POLICY IF EXISTS "Profiles: entity visibility"              ON public.profiles;
CREATE POLICY "Profiles: view own or admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.id = auth.uid() AND me.entity_id = profiles.entity_id
    )
  );

-- ── 3. PROJECTS ───────────────────────────────────────────────────────────────
-- Admin sees all; members only see projects they are explicitly added to
DROP POLICY IF EXISTS "Projects: admin full access"   ON public.projects;
DROP POLICY IF EXISTS "Projects: members can read"    ON public.projects;

CREATE POLICY "Projects: admin full access"
  ON public.projects FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY "Projects: members can read"
  ON public.projects FOR SELECT TO authenticated
  USING (public.is_project_member(id));

-- ── 4. PROJECT_MEMBERS ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Project Members: admin full access"    ON public.project_members;
DROP POLICY IF EXISTS "Project Members: members can read own" ON public.project_members;

CREATE POLICY "Project Members: admin full access"
  ON public.project_members FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY "Project Members: members can read own"
  ON public.project_members FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

-- ── 5. INVOICES ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Invoices: admin full access"                ON public.invoices;
DROP POLICY IF EXISTS "Invoices: project members can read"         ON public.invoices;
DROP POLICY IF EXISTS "Invoices: project members can insert own invoice" ON public.invoices;

CREATE POLICY "Invoices: admin full access"
  ON public.invoices FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY "Invoices: project members can read"
  ON public.invoices FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY "Invoices: project members can insert"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.is_project_member(project_id));

CREATE POLICY "Invoices: uploader can update"
  ON public.invoices FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() AND public.is_project_member(project_id));

CREATE POLICY "Invoices: uploader can delete"
  ON public.invoices FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- ── 6. LABOUR_ENTRIES ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Labour: admin full access"        ON public.labour_entries;
DROP POLICY IF EXISTS "Labour: project members can read" ON public.labour_entries;
DROP POLICY IF EXISTS "Labour: members can insert own entry" ON public.labour_entries;
DROP POLICY IF EXISTS "Labour: members can delete own entry" ON public.labour_entries;

CREATE POLICY "Labour: admin full access"
  ON public.labour_entries FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Labour: project members can read"
  ON public.labour_entries FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY "Labour: members can insert own entry"
  ON public.labour_entries FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.is_project_member(project_id));

CREATE POLICY "Labour: members can delete own entry"
  ON public.labour_entries FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- ── 7. CLIENTS ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clients: admin full access"                ON public.clients;
DROP POLICY IF EXISTS "Clients: authenticated users can read"     ON public.clients;
DROP POLICY IF EXISTS "Clients: members can read entity clients"  ON public.clients;

CREATE POLICY "Clients: admin full access"
  ON public.clients FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Clients: members can read entity clients"
  ON public.clients FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.entity_id = clients.entity_id
    )
  );

-- ── 8. QUOTES ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Quotes: admin full access"                             ON public.quotes;
DROP POLICY IF EXISTS "Quotes: authenticated users can read"                  ON public.quotes;
DROP POLICY IF EXISTS "Quotes: visible to creator, shared members and admin"  ON public.quotes;
DROP POLICY IF EXISTS "Quotes: authenticated users can insert"                ON public.quotes;
DROP POLICY IF EXISTS "Quotes: creator can update status"                     ON public.quotes;
DROP POLICY IF EXISTS "Quotes: creator or admin can update"                   ON public.quotes;

CREATE POLICY "Quotes: admin full access"
  ON public.quotes FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Quotes: visible to creator or shared members"
  ON public.quotes FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR auth.uid() = ANY(shared_with));

CREATE POLICY "Quotes: creator can insert"
  ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Quotes: creator can update"
  ON public.quotes FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Quotes: creator can delete"
  ON public.quotes FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- ── 9. QUOTE_ENTRIES ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Quote entries: admin full access"                    ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: authenticated users can read"         ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: visible on accessible quotes"         ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: authenticated users can insert own"   ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: insert own on visible quote"          ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: users can update own on visible quote" ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: users can delete own"                 ON public.quote_entries;

CREATE POLICY "Quote entries: admin full access"
  ON public.quote_entries FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Quote entries: read on accessible quote"
  ON public.quote_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_entries.quote_id
        AND (quotes.created_by = auth.uid() OR auth.uid() = ANY(quotes.shared_with))
    )
  );

CREATE POLICY "Quote entries: insert own on accessible quote"
  ON public.quote_entries FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_entries.quote_id
        AND (quotes.created_by = auth.uid() OR auth.uid() = ANY(quotes.shared_with))
    )
  );

CREATE POLICY "Quote entries: update own on accessible quote"
  ON public.quote_entries FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_entries.quote_id
        AND (quotes.created_by = auth.uid() OR auth.uid() = ANY(quotes.shared_with))
    )
  );

CREATE POLICY "Quote entries: delete own"
  ON public.quote_entries FOR DELETE TO authenticated
  USING (user_id = auth.uid());

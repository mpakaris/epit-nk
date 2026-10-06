-- ==============================================================================
-- Migration 011 — Fix Entity Isolation
-- Cleans up all conflicting RLS policies from migrations 005/008/010 and
-- recreates a single consistent, entity-scoped set.
-- Also adds email column to profiles so admin UIs can display it.
-- Safe to re-run.
-- ==============================================================================

-- ── 1. Add email column to profiles ──────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email for all existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- ── 2. Update trigger to keep email in sync ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role, entity_id, email, must_change_password)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NULLIF(NEW.raw_user_meta_data->>'entity_id', '')::UUID,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, TRUE)
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name         = EXCLUDED.display_name,
    role                 = EXCLUDED.role,
    entity_id            = EXCLUDED.entity_id,
    email                = EXCLUDED.email,
    must_change_password = EXCLUDED.must_change_password;
  RETURN NEW;
END;
$$;

-- ── 3. PROFILES — drop every known policy name from all migrations ────────────
DROP POLICY IF EXISTS "profiles: superadmin all"                  ON public.profiles;
DROP POLICY IF EXISTS "profiles: entity admin manages own entity" ON public.profiles;
DROP POLICY IF EXISTS "profiles: user reads own entity members"   ON public.profiles;
DROP POLICY IF EXISTS "profiles: entity members read"             ON public.profiles;
DROP POLICY IF EXISTS "profiles: user updates own"                ON public.profiles;
DROP POLICY IF EXISTS "Profiles: view own or admin"               ON public.profiles;
DROP POLICY IF EXISTS "Profiles: entity visibility"               ON public.profiles;

CREATE POLICY "profiles: superadmin all"
  ON public.profiles FOR ALL TO authenticated
  USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "profiles: entity admin manages own entity"
  ON public.profiles FOR ALL TO authenticated
  USING  (is_entity_admin() AND (entity_id = current_entity_id() OR id = auth.uid()))
  WITH CHECK (is_entity_admin() AND entity_id = current_entity_id());

CREATE POLICY "profiles: entity members read"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR entity_id = current_entity_id());

CREATE POLICY "profiles: user updates own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ── 4. PROJECTS ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "projects: superadmin all"          ON public.projects;
DROP POLICY IF EXISTS "projects: entity admin full access" ON public.projects;
DROP POLICY IF EXISTS "projects: members can read"        ON public.projects;
DROP POLICY IF EXISTS "Projects: admin full access"       ON public.projects;
DROP POLICY IF EXISTS "Projects: members can read"        ON public.projects;

CREATE POLICY "projects: superadmin all"
  ON public.projects FOR ALL TO authenticated
  USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "projects: entity admin full access"
  ON public.projects FOR ALL TO authenticated
  USING  (is_entity_admin() AND entity_id = current_entity_id())
  WITH CHECK (is_entity_admin() AND entity_id = current_entity_id());

CREATE POLICY "projects: members can read"
  ON public.projects FOR SELECT TO authenticated
  USING (entity_id = current_entity_id() AND is_project_member(id));

-- ── 5. PROJECT_MEMBERS ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "project_members: superadmin all"       ON public.project_members;
DROP POLICY IF EXISTS "project_members: entity admin full"    ON public.project_members;
DROP POLICY IF EXISTS "project_members: read own memberships" ON public.project_members;
DROP POLICY IF EXISTS "project_members: read own"             ON public.project_members;
DROP POLICY IF EXISTS "Project Members: admin full access"    ON public.project_members;
DROP POLICY IF EXISTS "Project Members: members can read own" ON public.project_members;

CREATE POLICY "project_members: superadmin all"
  ON public.project_members FOR ALL TO authenticated
  USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "project_members: entity admin full"
  ON public.project_members FOR ALL TO authenticated
  USING (
    is_entity_admin() AND
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND entity_id = current_entity_id())
  )
  WITH CHECK (
    is_entity_admin() AND
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND entity_id = current_entity_id())
  );

CREATE POLICY "project_members: read own"
  ON public.project_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_project_member(project_id));

-- ── 6. INVOICES ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "invoices: superadmin all"                        ON public.invoices;
DROP POLICY IF EXISTS "invoices: entity admin full"                     ON public.invoices;
DROP POLICY IF EXISTS "invoices: project members read"                  ON public.invoices;
DROP POLICY IF EXISTS "invoices: members insert own"                    ON public.invoices;
DROP POLICY IF EXISTS "Invoices: admin full access"                     ON public.invoices;
DROP POLICY IF EXISTS "Invoices: project members can read"              ON public.invoices;
DROP POLICY IF EXISTS "Invoices: project members can insert"            ON public.invoices;
DROP POLICY IF EXISTS "Invoices: project members can insert own invoice" ON public.invoices;
DROP POLICY IF EXISTS "Invoices: uploader can update"                   ON public.invoices;
DROP POLICY IF EXISTS "Invoices: uploader can delete"                   ON public.invoices;

CREATE POLICY "invoices: superadmin all"
  ON public.invoices FOR ALL TO authenticated
  USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "invoices: entity admin full"
  ON public.invoices FOR ALL TO authenticated
  USING (
    is_entity_admin() AND
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND entity_id = current_entity_id())
  )
  WITH CHECK (
    is_entity_admin() AND
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND entity_id = current_entity_id())
  );

CREATE POLICY "invoices: project members read"
  ON public.invoices FOR SELECT TO authenticated
  USING (is_project_member(project_id));

CREATE POLICY "invoices: members insert own"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND is_project_member(project_id));

-- ── 7. LABOUR_ENTRIES ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "labour: superadmin all"              ON public.labour_entries;
DROP POLICY IF EXISTS "labour: entity admin full"           ON public.labour_entries;
DROP POLICY IF EXISTS "labour: project members read"        ON public.labour_entries;
DROP POLICY IF EXISTS "labour: members insert own"          ON public.labour_entries;
DROP POLICY IF EXISTS "labour: member deletes own"          ON public.labour_entries;
DROP POLICY IF EXISTS "Labour: admin full access"           ON public.labour_entries;
DROP POLICY IF EXISTS "Labour: project members can read"    ON public.labour_entries;
DROP POLICY IF EXISTS "Labour: members can insert own entry" ON public.labour_entries;
DROP POLICY IF EXISTS "Labour: members can delete own entry" ON public.labour_entries;

CREATE POLICY "labour: superadmin all"
  ON public.labour_entries FOR ALL TO authenticated
  USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "labour: entity admin full"
  ON public.labour_entries FOR ALL TO authenticated
  USING (
    is_entity_admin() AND
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND entity_id = current_entity_id())
  )
  WITH CHECK (
    is_entity_admin() AND
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND entity_id = current_entity_id())
  );

CREATE POLICY "labour: project members read"
  ON public.labour_entries FOR SELECT TO authenticated
  USING (is_project_member(project_id));

CREATE POLICY "labour: members insert own"
  ON public.labour_entries FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND is_project_member(project_id));

CREATE POLICY "labour: member deletes own"
  ON public.labour_entries FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid() AND
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND entity_id = current_entity_id())
  );

-- ── 8. CLIENTS ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "clients: superadmin all"                   ON public.clients;
DROP POLICY IF EXISTS "clients: entity admin full"                ON public.clients;
DROP POLICY IF EXISTS "clients: entity members read"              ON public.clients;
DROP POLICY IF EXISTS "Clients: admin full access"                ON public.clients;
DROP POLICY IF EXISTS "Clients: authenticated users can read"     ON public.clients;
DROP POLICY IF EXISTS "Clients: members can read entity clients"  ON public.clients;

CREATE POLICY "clients: superadmin all"
  ON public.clients FOR ALL TO authenticated
  USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "clients: entity admin full"
  ON public.clients FOR ALL TO authenticated
  USING  (is_entity_admin() AND entity_id = current_entity_id())
  WITH CHECK (is_entity_admin() AND entity_id = current_entity_id());

CREATE POLICY "clients: entity members read"
  ON public.clients FOR SELECT TO authenticated
  USING (entity_id = current_entity_id());

-- ── 9. QUOTES ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "quotes: superadmin all"                            ON public.quotes;
DROP POLICY IF EXISTS "quotes: entity admin full"                         ON public.quotes;
DROP POLICY IF EXISTS "quotes: visible to creator and shared"             ON public.quotes;
DROP POLICY IF EXISTS "quotes: entity member insert own"                  ON public.quotes;
DROP POLICY IF EXISTS "quotes: creator updates"                           ON public.quotes;
DROP POLICY IF EXISTS "Quotes: admin full access"                         ON public.quotes;
DROP POLICY IF EXISTS "Quotes: authenticated users can read"              ON public.quotes;
DROP POLICY IF EXISTS "Quotes: visible to creator, shared members and admin" ON public.quotes;
DROP POLICY IF EXISTS "Quotes: visible to creator or shared members"      ON public.quotes;
DROP POLICY IF EXISTS "Quotes: authenticated users can insert"            ON public.quotes;
DROP POLICY IF EXISTS "Quotes: creator can insert"                        ON public.quotes;
DROP POLICY IF EXISTS "Quotes: creator can update status"                 ON public.quotes;
DROP POLICY IF EXISTS "Quotes: creator or admin can update"               ON public.quotes;
DROP POLICY IF EXISTS "Quotes: creator can update"                        ON public.quotes;
DROP POLICY IF EXISTS "Quotes: creator can delete"                        ON public.quotes;

CREATE POLICY "quotes: superadmin all"
  ON public.quotes FOR ALL TO authenticated
  USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "quotes: entity admin full"
  ON public.quotes FOR ALL TO authenticated
  USING  (is_entity_admin() AND entity_id = current_entity_id())
  WITH CHECK (is_entity_admin() AND entity_id = current_entity_id());

CREATE POLICY "quotes: visible to creator and shared"
  ON public.quotes FOR SELECT TO authenticated
  USING (
    entity_id = current_entity_id() AND (
      created_by = auth.uid() OR auth.uid() = ANY(shared_with)
    )
  );

CREATE POLICY "quotes: entity member insert own"
  ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (entity_id = current_entity_id() AND created_by = auth.uid());

CREATE POLICY "quotes: creator updates"
  ON public.quotes FOR UPDATE TO authenticated
  USING (entity_id = current_entity_id() AND created_by = auth.uid());

-- ── 10. QUOTE_ENTRIES ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "quote_entries: superadmin all"                   ON public.quote_entries;
DROP POLICY IF EXISTS "quote_entries: entity admin full"                ON public.quote_entries;
DROP POLICY IF EXISTS "quote_entries: read on visible quote"            ON public.quote_entries;
DROP POLICY IF EXISTS "quote_entries: insert own on visible quote"      ON public.quote_entries;
DROP POLICY IF EXISTS "quote_entries: update own"                       ON public.quote_entries;
DROP POLICY IF EXISTS "quote_entries: delete own"                       ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: admin full access"                ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: authenticated users can read"     ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: visible on accessible quotes"     ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: read on accessible quote"         ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: authenticated users can insert own" ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: insert own on visible quote"      ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: insert own on accessible quote"   ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: users can update own on visible quote" ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: update own on accessible quote"   ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: users can delete own"             ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: delete own"                       ON public.quote_entries;

CREATE POLICY "quote_entries: superadmin all"
  ON public.quote_entries FOR ALL TO authenticated
  USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "quote_entries: entity admin full"
  ON public.quote_entries FOR ALL TO authenticated
  USING (
    is_entity_admin() AND
    EXISTS (SELECT 1 FROM public.quotes WHERE id = quote_id AND entity_id = current_entity_id())
  )
  WITH CHECK (
    is_entity_admin() AND
    EXISTS (SELECT 1 FROM public.quotes WHERE id = quote_id AND entity_id = current_entity_id())
  );

CREATE POLICY "quote_entries: read on visible quote"
  ON public.quote_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_id
        AND quotes.entity_id = current_entity_id()
        AND (quotes.created_by = auth.uid() OR auth.uid() = ANY(quotes.shared_with))
    )
  );

CREATE POLICY "quote_entries: insert own on visible quote"
  ON public.quote_entries FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_id
        AND quotes.entity_id = current_entity_id()
        AND (quotes.created_by = auth.uid() OR auth.uid() = ANY(quotes.shared_with))
    )
  );

CREATE POLICY "quote_entries: update own"
  ON public.quote_entries FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "quote_entries: delete own"
  ON public.quote_entries FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ==============================================================================
-- After running this migration:
-- Verify that every non-superadmin user has entity_id set in their profile.
-- Run: SELECT id, display_name, role, entity_id FROM public.profiles WHERE entity_id IS NULL AND role != 'superadmin';
-- Any rows returned are users stuck with no entity — assign them manually:
-- UPDATE public.profiles SET entity_id = '<entity-uuid>' WHERE id = '<user-uuid>';
-- ==============================================================================

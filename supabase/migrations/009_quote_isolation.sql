-- ==============================================================================
-- Migration 009 — Proper quote & client isolation
-- Members only see quotes they created or are explicitly invited to.
-- Members only see clients from their own entity.
-- ==============================================================================

-- 1. QUOTES SELECT: creator / shared_with / admin only
DROP POLICY IF EXISTS "Quotes: authenticated users can read" ON public.quotes;
DROP POLICY IF EXISTS "Quotes: visible to creator, shared members and admin" ON public.quotes;
CREATE POLICY "Quotes: visible to creator, shared members and admin"
  ON public.quotes FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR created_by = auth.uid()
    OR auth.uid() = ANY(shared_with)
  );

-- 2. QUOTES UPDATE: creator or admin only
DROP POLICY IF EXISTS "Quotes: creator can update status" ON public.quotes;
DROP POLICY IF EXISTS "Quotes: creator or admin can update" ON public.quotes;
CREATE POLICY "Quotes: creator or admin can update"
  ON public.quotes FOR UPDATE TO authenticated
  USING (public.is_admin() OR created_by = auth.uid());

-- 3. QUOTE_ENTRIES SELECT: only entries on quotes the user can access
DROP POLICY IF EXISTS "Quote entries: authenticated users can read" ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: visible on accessible quotes" ON public.quote_entries;
CREATE POLICY "Quote entries: visible on accessible quotes"
  ON public.quote_entries FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_entries.quote_id
        AND (quotes.created_by = auth.uid() OR auth.uid() = ANY(quotes.shared_with))
    )
  );

-- 4. QUOTE_ENTRIES INSERT: own entry, only on visible quotes
DROP POLICY IF EXISTS "Quote entries: authenticated users can insert own" ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: insert own on visible quote" ON public.quote_entries;
CREATE POLICY "Quote entries: insert own on visible quote"
  ON public.quote_entries FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_entries.quote_id
        AND (
          public.is_admin()
          OR quotes.created_by = auth.uid()
          OR auth.uid() = ANY(quotes.shared_with)
        )
    )
  );

-- 5. QUOTE_ENTRIES UPDATE: own entry, only on visible quotes
DROP POLICY IF EXISTS "Quote entries: users can update own on visible quote" ON public.quote_entries;
CREATE POLICY "Quote entries: users can update own on visible quote"
  ON public.quote_entries FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_entries.quote_id
        AND (
          public.is_admin()
          OR quotes.created_by = auth.uid()
          OR auth.uid() = ANY(quotes.shared_with)
        )
    )
  );

-- 6. QUOTE_ENTRIES DELETE: own entry (keep simple — already correct)
DROP POLICY IF EXISTS "Quote entries: users can delete own" ON public.quote_entries;
CREATE POLICY "Quote entries: users can delete own"
  ON public.quote_entries FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 7. CLIENTS SELECT: entity members can read clients from their own entity
DROP POLICY IF EXISTS "Clients: members can read entity clients" ON public.clients;
CREATE POLICY "Clients: members can read entity clients"
  ON public.clients FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.entity_id = clients.entity_id
    )
  );

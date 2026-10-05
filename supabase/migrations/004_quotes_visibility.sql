-- ==============================================================================
-- Migration 004 — Quote visibility: shared_with column + tightened RLS
-- Run in Supabase Dashboard → SQL Editor
-- ==============================================================================

-- 1. Add shared_with column to quotes (array of user UUIDs)
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS shared_with UUID[] DEFAULT '{}';

-- 2. Drop old permissive read policy
DROP POLICY IF EXISTS "Quotes: authenticated users can read" ON public.quotes;

-- 3. New read policy: creator, shared members, or admin
CREATE POLICY "Quotes: visible to creator, shared members and admin"
  ON public.quotes FOR SELECT TO authenticated
  USING (
    public.is_admin() OR
    created_by = auth.uid() OR
    auth.uid() = ANY(shared_with)
  );

-- 4. Allow creator/admin to update shared_with (covered by existing update policy)
-- The existing "Quotes: creator can update status" policy covers all field updates
-- for the creator, so no change needed there.

-- 5. Tighten quote_entries INSERT: only creator, shared members, or admin can add entries
DROP POLICY IF EXISTS "Quote entries: authenticated users can insert own" ON public.quote_entries;
CREATE POLICY "Quote entries: insert own on visible quote"
  ON public.quote_entries FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_entries.quote_id
        AND (
          public.is_admin() OR
          quotes.created_by = auth.uid() OR
          auth.uid() = ANY(quotes.shared_with)
        )
    )
  );

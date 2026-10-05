-- ==============================================================================
-- Migration 003 — Add entry_type, quantity, unit, unit_price to quote_entries
-- Run in Supabase Dashboard → SQL Editor
-- ==============================================================================

ALTER TABLE public.quote_entries
  ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'other'
    CHECK (entry_type IN ('material', 'labour', 'equipment', 'transport', 'other'));

ALTER TABLE public.quote_entries ADD COLUMN IF NOT EXISTS quantity DECIMAL(10, 3);
ALTER TABLE public.quote_entries ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.quote_entries ADD COLUMN IF NOT EXISTS unit_price INTEGER;

-- Allow entry owners to update their own entries
DROP POLICY IF EXISTS "Quote entries: users can update own" ON public.quote_entries;
CREATE POLICY "Quote entries: users can update own"
  ON public.quote_entries FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

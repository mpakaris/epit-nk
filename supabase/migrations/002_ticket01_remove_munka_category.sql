-- ==============================================================================
-- Migration 002 — TICKET-01: Remove 'Munka' from invoice categories
-- Existing 'Munka' invoices are moved to 'Egyéb' before the constraint changes.
-- Run in Supabase Dashboard → SQL Editor
-- ==============================================================================

-- Migrate existing 'Munka' invoices to 'Egyéb'
UPDATE public.invoices SET category = 'Egyéb' WHERE category = 'Munka';

-- Drop the old check constraint and recreate without 'Munka'
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_category_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_category_check
  CHECK (category IN ('Anyag', 'Szerszám/Eszköz', 'Szállítás', 'Engedély/Hatóság', 'Egyéb'));

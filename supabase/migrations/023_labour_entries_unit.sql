-- Migration 023 — Add unit column to labour_entries
-- Allows quantity-based rates beyond hours (m², m³, m, fm, nap, db, l…)
-- Existing rows default to 'h' (hours), preserving backward compatibility.

ALTER TABLE public.labour_entries
  ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'h';

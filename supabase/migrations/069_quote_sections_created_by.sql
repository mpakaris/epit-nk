-- Migration 069 — Track section creator (mirrors quote_entries.user_id pattern)
ALTER TABLE public.quote_sections
  ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT DEFAULT NULL;

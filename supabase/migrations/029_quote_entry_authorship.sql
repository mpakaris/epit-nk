-- Per-entry authorship on quote entries
-- user_id already exists (executor); created_by_name is who added the line
ALTER TABLE public.quote_entries
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

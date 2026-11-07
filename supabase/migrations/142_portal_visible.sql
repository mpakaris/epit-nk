-- Migration 142: portal_visible columns for per-item sharing
-- Contractors opt-in to sharing each item individually (default = hidden).
-- Diary entries already use is_public — no change needed there.
-- media_items uses a polymorphic document_id (not project_id) — index reflects that.

ALTER TABLE public.invoices       ADD COLUMN IF NOT EXISTS portal_visible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.labour_entries ADD COLUMN IF NOT EXISTS portal_visible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.media_items    ADD COLUMN IF NOT EXISTS portal_visible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.quotes         ADD COLUMN IF NOT EXISTS portal_visible BOOLEAN NOT NULL DEFAULT false;

-- Partial indexes — only index the rows that are actually shared (small fraction of total)
CREATE INDEX IF NOT EXISTS invoices_portal_idx        ON public.invoices(project_id)  WHERE portal_visible = true;
CREATE INDEX IF NOT EXISTS labour_entries_portal_idx  ON public.labour_entries(project_id) WHERE portal_visible = true;
CREATE INDEX IF NOT EXISTS media_items_portal_idx     ON public.media_items(document_id)   WHERE portal_visible = true;
CREATE INDEX IF NOT EXISTS quotes_portal_idx          ON public.quotes(client_id)     WHERE portal_visible = true;

-- Backfill: existing sent/accepted/rejected quotes stay visible on the portal
-- so clients who already received a quote don't lose access on deploy
UPDATE public.quotes
SET portal_visible = true
WHERE status IN ('sent', 'accepted', 'rejected')
  AND deleted_at IS NULL;

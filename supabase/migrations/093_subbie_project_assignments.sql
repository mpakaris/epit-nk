-- Subbies are WhatsApp-only and have no profiles row.
-- Drop the FK on uploaded_by so Subbies (identified by wa_account.id) can upload records.
ALTER TABLE public.invoices       DROP CONSTRAINT IF EXISTS invoices_uploaded_by_fkey;
ALTER TABLE public.labour_entries DROP CONSTRAINT IF EXISTS labour_entries_uploaded_by_fkey;

-- Which projects a Subbie is allowed to work on
CREATE TABLE IF NOT EXISTS public.subbie_project_assignments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_account_id   UUID        NOT NULL REFERENCES public.wa_accounts(id) ON DELETE CASCADE,
  project_id      UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  assigned_by     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wa_account_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_subbie_assignments_wa_account
  ON public.subbie_project_assignments(wa_account_id);
CREATE INDEX IF NOT EXISTS idx_subbie_assignments_project
  ON public.subbie_project_assignments(project_id);

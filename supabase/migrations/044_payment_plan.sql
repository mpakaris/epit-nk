-- Payment plan items (installments the client owes the contractor)
CREATE TABLE public.payment_plan_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_id       UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  label           TEXT NOT NULL,
  trigger_type    TEXT NOT NULL DEFAULT 'milestone'
                    CHECK (trigger_type IN ('start', 'end', 'milestone', 'date')),
  milestone_name  TEXT,
  amount_huf      INTEGER NOT NULL CHECK (amount_huf > 0),
  due_date        DATE,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at         TIMESTAMPTZ,
  note            TEXT,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_plan_items_project_id ON public.payment_plan_items(project_id);
CREATE INDEX idx_payment_plan_items_entity_id  ON public.payment_plan_items(entity_id);
CREATE INDEX idx_payment_plan_items_status     ON public.payment_plan_items(status);

-- File attachments per payment item (uploaded invoices, proofs of payment, etc.)
CREATE TABLE public.payment_item_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID NOT NULL REFERENCES public.payment_plan_items(id) ON DELETE CASCADE,
  uploaded_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_url      TEXT NOT NULL,
  storage_path  TEXT,
  file_name     TEXT,
  mime_type     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_item_files_item_id ON public.payment_item_files(item_id);

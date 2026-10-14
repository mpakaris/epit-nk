-- Invoice cost allocation across sections (project_rooms)
-- One invoice can contribute partial amounts to multiple sections
CREATE TABLE public.invoice_section_splits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES public.invoices(id)       ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES public.projects(id)       ON DELETE CASCADE,
  room_id     UUID NOT NULL REFERENCES public.project_rooms(id)  ON DELETE CASCADE,
  amount_huf  INTEGER NOT NULL CHECK (amount_huf > 0),
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_splits_invoice ON public.invoice_section_splits(invoice_id);
CREATE INDEX idx_invoice_splits_project ON public.invoice_section_splits(project_id);
CREATE INDEX idx_invoice_splits_room    ON public.invoice_section_splits(room_id);

ALTER TABLE public.invoice_section_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_splits: superadmin all"
  ON public.invoice_section_splits FOR ALL TO authenticated
  USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "invoice_splits: entity admin full"
  ON public.invoice_section_splits FOR ALL TO authenticated
  USING (
    is_entity_admin() AND
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND entity_id = current_entity_id())
  )
  WITH CHECK (
    is_entity_admin() AND
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND entity_id = current_entity_id())
  );

CREATE POLICY "invoice_splits: project members read"
  ON public.invoice_section_splits FOR SELECT TO authenticated
  USING (is_project_member(project_id));

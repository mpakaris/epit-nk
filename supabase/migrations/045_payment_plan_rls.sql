-- RLS policies for payment_plan_items and payment_item_files

ALTER TABLE public.payment_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_item_files  ENABLE ROW LEVEL SECURITY;

-- ── payment_plan_items ────────────────────────────────────────────────────────

CREATE POLICY "payment_plan: superadmin all"
  ON public.payment_plan_items FOR ALL TO authenticated
  USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "payment_plan: entity admin full"
  ON public.payment_plan_items FOR ALL TO authenticated
  USING (
    is_entity_admin() AND entity_id = current_entity_id()
  )
  WITH CHECK (
    is_entity_admin() AND entity_id = current_entity_id()
  );

CREATE POLICY "payment_plan: project members read"
  ON public.payment_plan_items FOR SELECT TO authenticated
  USING (is_project_member(project_id));

-- ── payment_item_files ────────────────────────────────────────────────────────

CREATE POLICY "payment_item_files: superadmin all"
  ON public.payment_item_files FOR ALL TO authenticated
  USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "payment_item_files: entity admin full"
  ON public.payment_item_files FOR ALL TO authenticated
  USING (
    is_entity_admin() AND
    EXISTS (
      SELECT 1 FROM public.payment_plan_items
      WHERE id = item_id AND entity_id = current_entity_id()
    )
  )
  WITH CHECK (
    is_entity_admin() AND
    EXISTS (
      SELECT 1 FROM public.payment_plan_items
      WHERE id = item_id AND entity_id = current_entity_id()
    )
  );

CREATE POLICY "payment_item_files: project members read"
  ON public.payment_item_files FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payment_plan_items
      WHERE id = item_id AND is_project_member(project_id)
    )
  );

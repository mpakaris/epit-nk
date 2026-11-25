-- Migration 155: repurpose payment_plan_items as Kiszámlázás (client invoice tracker)
-- Removes obsolete payment-plan-specific columns, adds sent tracking

ALTER TABLE public.payment_plan_items DROP COLUMN IF EXISTS trigger_type;
ALTER TABLE public.payment_plan_items DROP COLUMN IF EXISTS milestone_name;
ALTER TABLE public.payment_plan_items ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NULL;

-- Extend status to include 'sent' (invoice emailed to client, awaiting payment)
ALTER TABLE public.payment_plan_items DROP CONSTRAINT IF EXISTS payment_plan_items_status_check;
ALTER TABLE public.payment_plan_items
  ADD CONSTRAINT payment_plan_items_status_check
  CHECK (status IN ('pending', 'sent', 'paid', 'cancelled'));

-- Migration 125: make entity_id nullable on payment_plan_items
-- entity_id is a remnant of the old entities architecture; new projects do not set it.
ALTER TABLE payment_plan_items ALTER COLUMN entity_id DROP NOT NULL;

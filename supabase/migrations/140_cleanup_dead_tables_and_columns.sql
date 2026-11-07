-- Migration 140: Drop dead tables and stale columns
-- Apply via Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- Summary of changes:
--   Tables dropped : quote_templates (0 rows, 0 code refs)
--                    survey_items    (0 rows, 0 code refs — routes use survey_entry_items)
--   Columns dropped: profiles.is_website_premium        (dead, replaced by is_subscription_premium)
--                    diary_share_tokens.entity_id        (never inserted or selected)
--                    audit_logs.entity_id                (always NULL, FK already removed by migration 139)
--                    payment_plan_items.entity_id        (FK removed by migration 139; code updated to use user.id)

-- ── Tables ────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.quote_templates;
DROP TABLE IF EXISTS public.survey_items;

-- ── Columns ───────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles           DROP COLUMN IF EXISTS is_website_premium;
ALTER TABLE public.diary_share_tokens DROP COLUMN IF EXISTS entity_id;
ALTER TABLE public.audit_logs         DROP COLUMN IF EXISTS entity_id;
ALTER TABLE public.payment_plan_items DROP COLUMN IF EXISTS entity_id;

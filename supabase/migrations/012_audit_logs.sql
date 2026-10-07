-- ==============================================================================
-- Migration 012 — Audit Logs
-- Tracks every significant action for superadmin review.
-- Safe to re-run.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id   UUID        REFERENCES public.entities(id) ON DELETE SET NULL,
  user_id     UUID        REFERENCES public.profiles(id)  ON DELETE SET NULL,
  user_name   TEXT        NOT NULL DEFAULT '',
  action      TEXT        NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  target_name TEXT,
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id  ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON public.audit_logs(action);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only superadmin can read via RLS; all inserts go through admin client (service role, bypasses RLS)
DROP POLICY IF EXISTS "audit_logs: superadmin read" ON public.audit_logs;
CREATE POLICY "audit_logs: superadmin read"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_superadmin());

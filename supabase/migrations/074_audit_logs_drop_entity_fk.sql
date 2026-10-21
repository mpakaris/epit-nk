-- Migration 074 — Drop FK on audit_logs.entity_id
-- entity_id now holds either a collective UUID or a user UUID (personal workspace).
-- The old FK to entities(id) blocks all modern logAudit calls. Drop it.
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_entity_id_fkey;

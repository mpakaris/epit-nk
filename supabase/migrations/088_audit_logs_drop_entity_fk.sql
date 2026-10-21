-- Migration 088 — Drop FK on audit_logs.entity_id
-- entity_id now holds either a collective UUID or a user UUID (personal workspace).
-- The old FK to entities(id) was blocking all modern logAudit inserts with a silent
-- FK violation. Drop the constraint so entity_id is a free UUID field.
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_entity_id_fkey;

-- Migration 066: Add 'blocked' status to collective_members
ALTER TABLE public.collective_members
  DROP CONSTRAINT collective_members_status_check,
  ADD CONSTRAINT collective_members_status_check
    CHECK (status IN ('invited', 'active', 'blocked'));

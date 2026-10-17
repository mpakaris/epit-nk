-- Migration 065: Add 'retracted' to collective_invitations status
ALTER TABLE public.collective_invitations
  DROP CONSTRAINT collective_invitations_status_check,
  ADD CONSTRAINT collective_invitations_status_check
    CHECK (status IN ('pending', 'accepted', 'declined', 'retracted'));

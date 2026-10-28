-- Migration 116: add transfer_expired to transfer_requests status constraint
ALTER TABLE transfer_requests
  DROP CONSTRAINT IF EXISTS transfer_requests_status_check;

ALTER TABLE transfer_requests
  ADD CONSTRAINT transfer_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'retracted', 'transfer_expired'));

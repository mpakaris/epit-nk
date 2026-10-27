ALTER TABLE transfer_requests ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES profiles(id);

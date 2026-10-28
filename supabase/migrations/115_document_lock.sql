-- Migration 115: document lock state for rejected/expired transfer requests
-- Apply via Supabase SQL editor

ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS locked_reason text
    CHECK (locked_reason IN ('transfer_rejected', 'transfer_expired', 'quota_exceeded')),
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS locked_reason text
    CHECK (locked_reason IN ('transfer_rejected', 'transfer_expired', 'quota_exceeded')),
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS locked_reason text
    CHECK (locked_reason IN ('transfer_rejected', 'transfer_expired', 'quota_exceeded')),
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

-- Index for fast cron queries (find locked docs by reason)
CREATE INDEX IF NOT EXISTS idx_surveys_locked_reason  ON surveys  (locked_reason) WHERE locked_reason IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_locked_reason   ON quotes   (locked_reason) WHERE locked_reason IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_locked_reason ON projects (locked_reason) WHERE locked_reason IS NOT NULL;

-- Also add transfer_attempt_count to transfer_requests for convenience (optional, derived)
-- We derive attempt count at runtime from the table, no extra column needed.

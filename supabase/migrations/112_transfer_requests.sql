CREATE TABLE IF NOT EXISTS transfer_requests (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type  TEXT        NOT NULL CHECK (document_type IN ('project', 'quote', 'survey')),
  document_id    UUID        NOT NULL,
  document_title TEXT,
  from_user_id   UUID        NOT NULL REFERENCES profiles(id),
  collective_id  UUID        NOT NULL REFERENCES collectives(id),
  status         TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS transfer_requests_collective_status ON transfer_requests (collective_id, status);
CREATE INDEX IF NOT EXISTS transfer_requests_from_user       ON transfer_requests (from_user_id);
CREATE INDEX IF NOT EXISTS transfer_requests_document        ON transfer_requests (document_type, document_id);

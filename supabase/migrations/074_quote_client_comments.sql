-- Client feedback history on quotes (portal actions: accept / reject / question)
CREATE TABLE IF NOT EXISTS quote_client_comments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id     UUID        NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  action       TEXT        NOT NULL CHECK (action IN ('accepted', 'rejected', 'question')),
  comment      TEXT,
  client_email TEXT        NOT NULL,
  client_name  TEXT,
  resolved_at  TIMESTAMPTZ,
  resolved_by  UUID        REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_client_comments_quote_id
  ON quote_client_comments(quote_id);

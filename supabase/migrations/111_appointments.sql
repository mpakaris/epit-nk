CREATE TABLE IF NOT EXISTS appointments (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id      UUID NOT NULL REFERENCES profiles(id),
  collective_id UUID REFERENCES collectives(id) ON DELETE SET NULL,
  created_by    UUID REFERENCES profiles(id),
  title         TEXT NOT NULL,
  date          DATE NOT NULL,
  time          TIME,
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  link_type     TEXT CHECK (link_type IN ('felmeres', 'ajanlat', 'projekt')),
  linked_survey_id  UUID REFERENCES surveys(id)  ON DELETE SET NULL,
  linked_quote_id   UUID REFERENCES quotes(id)   ON DELETE SET NULL,
  linked_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS appointments_owner_date  ON appointments (owner_id, date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS appointments_collective   ON appointments (collective_id, date) WHERE deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';

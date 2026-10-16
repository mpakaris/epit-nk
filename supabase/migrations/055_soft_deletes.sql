-- Soft deletes for surveys and quotes.
-- deleted_at IS NOT NULL means hidden from all list queries; the row stays in DB
-- so offers can still reference their linked survey by ID.
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS deleted_by   UUID        REFERENCES auth.users(id);
ALTER TABLE quotes  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE quotes  ADD COLUMN IF NOT EXISTS deleted_by   UUID        REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS surveys_deleted_at_idx ON surveys (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS quotes_deleted_at_idx  ON quotes  (deleted_at) WHERE deleted_at IS NULL;

-- Store room dimensions as raw inputs. size_m2 is computed (width_m * length_m).
-- perimeter_m is a legacy computed column; no longer written to.
ALTER TABLE survey_entries ADD COLUMN IF NOT EXISTS width_m  NUMERIC;
ALTER TABLE survey_entries ADD COLUMN IF NOT EXISTS length_m NUMERIC;
ALTER TABLE quote_sections ADD COLUMN IF NOT EXISTS width_m  NUMERIC;
ALTER TABLE quote_sections ADD COLUMN IF NOT EXISTS length_m NUMERIC;

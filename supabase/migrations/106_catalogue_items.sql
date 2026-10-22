CREATE TABLE catalogue_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  owner_id        UUID REFERENCES auth.users(id),
  collective_id   UUID REFERENCES collectives(id) ON DELETE CASCADE,

  trade           TEXT,           -- 'csempés' | 'festő' | 'gipszkartonos' | 'általános' | etc.
  name            TEXT NOT NULL,
  unit            TEXT NOT NULL,
  labour_price    NUMERIC,        -- Ft per unit
  materials       JSONB,          -- [{ name, qty_per_unit, unit, price_per_unit }]
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INT NOT NULL DEFAULT 0
);

CREATE INDEX catalogue_items_owner_id_idx     ON catalogue_items(owner_id);
CREATE INDEX catalogue_items_collective_id_idx ON catalogue_items(collective_id);

-- Now that catalogue_items exists, add the FK from survey_entry_items
ALTER TABLE survey_entry_items
  ADD CONSTRAINT survey_entry_items_catalogue_item_id_fkey
  FOREIGN KEY (catalogue_item_id) REFERENCES catalogue_items(id) ON DELETE SET NULL;

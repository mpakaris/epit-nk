CREATE TABLE survey_entry_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  entry_id          UUID NOT NULL REFERENCES survey_entries(id) ON DELETE CASCADE,
  survey_id         UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  owner_id          UUID REFERENCES auth.users(id),
  created_by        UUID REFERENCES auth.users(id),

  description       TEXT NOT NULL,
  quantity          NUMERIC,
  unit              TEXT,
  notes             TEXT,

  source            TEXT NOT NULL DEFAULT 'manual',   -- 'manual' | 'user_note' | 'ai_suggestion'
  is_confirmed      BOOLEAN NOT NULL DEFAULT true,    -- false = AI suggestion, shown greyed out

  catalogue_item_id UUID,   -- forward ref; FK added after catalogue_items is created
  quote_entry_id    UUID REFERENCES quote_entries(id) ON DELETE SET NULL,

  sort_order        INT NOT NULL DEFAULT 0
);

CREATE INDEX survey_entry_items_entry_id_idx  ON survey_entry_items(entry_id);
CREATE INDEX survey_entry_items_survey_id_idx ON survey_entry_items(survey_id);

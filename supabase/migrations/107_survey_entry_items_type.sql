ALTER TABLE survey_entry_items
  ADD COLUMN entry_type TEXT NOT NULL DEFAULT 'material';

COMMENT ON COLUMN survey_entry_items.entry_type IS 'material | labour | other';

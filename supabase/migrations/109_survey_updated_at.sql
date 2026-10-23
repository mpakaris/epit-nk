-- Track last activity on surveys so stale ones can be surfaced.
-- updated_at is touched by: metadata edits, entry add/edit, media upload.

ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Backfill: use created_at as the starting point
UPDATE surveys SET updated_at = created_at WHERE updated_at IS NULL;

-- ── Trigger: surveys row itself ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_survey_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_surveys_updated_at ON surveys;
CREATE TRIGGER trg_surveys_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION touch_survey_updated_at();

-- ── Trigger: survey_entries (child rows) ──────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_parent_survey_on_entry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE surveys SET updated_at = NOW()
  WHERE id = COALESCE(NEW.survey_id, OLD.survey_id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_survey_entries_touch_parent ON survey_entries;
CREATE TRIGGER trg_survey_entries_touch_parent
  AFTER INSERT OR UPDATE OR DELETE ON survey_entries
  FOR EACH ROW EXECUTE FUNCTION touch_parent_survey_on_entry();

-- ── Trigger: survey_media (child rows) ───────────────────────────────────────
DROP TRIGGER IF EXISTS trg_survey_media_touch_parent ON survey_media;
CREATE TRIGGER trg_survey_media_touch_parent
  AFTER INSERT OR UPDATE OR DELETE ON survey_media
  FOR EACH ROW EXECUTE FUNCTION touch_parent_survey_on_entry();

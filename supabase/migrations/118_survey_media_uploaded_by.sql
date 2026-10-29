-- Track who uploaded each survey media file so contributors can delete only their own uploads.
ALTER TABLE survey_media
  ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for the permission check in the DELETE route
CREATE INDEX IF NOT EXISTS survey_media_uploaded_by_idx ON survey_media (uploaded_by);

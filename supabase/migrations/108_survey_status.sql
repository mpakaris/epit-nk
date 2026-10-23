-- Add lifecycle status to surveys
-- active   = in progress (default for all existing rows)
-- done     = used as a quote template at least once; no longer shown by default
-- reopened = manually re-opened after being done; shows "Send to Quote" on new entries

ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS status       TEXT        NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS done_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reopened_at  TIMESTAMPTZ;

-- Backfill: surveys already linked to at least one non-deleted quote → mark done
UPDATE surveys s
SET    status  = 'done',
       done_at = NOW()
WHERE  status  = 'active'
  AND  EXISTS (
    SELECT 1 FROM quotes q
    WHERE  q.survey_id = s.id
      AND  q.status   != 'deleted'
  );

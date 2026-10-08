-- Migration 021 — Backfill survey_entry_id on existing quote_sections
-- Quotes created from a survey before migration 020 have survey_entry_id = NULL
-- on their sections. This matches each section back to the survey entry by name
-- so that existing quotes can display their survey room photos.
UPDATE public.quote_sections qs
SET survey_entry_id = se.id
FROM public.quotes q
JOIN public.survey_entries se
  ON se.survey_id = q.survey_id
 AND se.name = qs.name
WHERE qs.survey_entry_id IS NULL
  AND q.survey_id IS NOT NULL
  AND qs.quote_id = q.id;

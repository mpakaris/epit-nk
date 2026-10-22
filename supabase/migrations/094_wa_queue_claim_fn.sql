-- Atomically claims up to batch_size pending queue items and locks them for 60 seconds.
-- Returns the claimed rows so the worker can process them.
CREATE OR REPLACE FUNCTION public.claim_wa_queue_items(batch_size INT DEFAULT 3)
RETURNS SETOF public.wa_processing_queue
LANGUAGE sql
AS $$
  UPDATE public.wa_processing_queue
  SET
    status       = 'processing',
    locked_until = NOW() + INTERVAL '60 seconds'
  WHERE id IN (
    SELECT id FROM public.wa_processing_queue
    WHERE status = 'pending'
      AND (locked_until IS NULL OR locked_until < NOW())
    ORDER BY enqueued_at
    LIMIT batch_size
  )
  RETURNING *;
$$;

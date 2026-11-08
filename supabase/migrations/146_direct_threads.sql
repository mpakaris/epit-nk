-- Migration 146: direct user-to-user threads
-- Adds recipient_user_id to threads so two collective members can exchange 1:1 messages.

ALTER TABLE public.threads
  ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Fast lookup: "find the direct thread between user A and user B"
CREATE INDEX IF NOT EXISTS threads_direct_pair_idx
  ON public.threads (owner_id, recipient_user_id)
  WHERE type = 'direct';

-- Fast lookup: "all direct threads where I am the recipient"
CREATE INDEX IF NOT EXISTS threads_direct_recipient_idx
  ON public.threads (recipient_user_id)
  WHERE type = 'direct';

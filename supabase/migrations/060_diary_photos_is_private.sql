ALTER TABLE public.diary_photos
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

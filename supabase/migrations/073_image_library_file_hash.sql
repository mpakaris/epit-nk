-- Migration 073: Add file_hash for duplicate detection in image_library
ALTER TABLE public.image_library
  ADD COLUMN IF NOT EXISTS file_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_image_library_file_hash
  ON public.image_library (file_hash)
  WHERE file_hash IS NOT NULL;

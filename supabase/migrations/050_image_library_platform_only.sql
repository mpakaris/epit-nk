-- Images marked is_platform_only are superadmin-internal and never shown
-- in the user-facing /api/image-library endpoint (e.g. specialist website picker)
ALTER TABLE public.image_library
  ADD COLUMN IF NOT EXISTS is_platform_only BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_image_library_platform_only
  ON public.image_library(is_platform_only);

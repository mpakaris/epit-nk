-- Mark one image in the library as the platform landing page hero
ALTER TABLE public.image_library
  ADD COLUMN IF NOT EXISTS is_platform_hero BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_image_library_platform_hero ON public.image_library(is_platform_hero)
  WHERE is_platform_hero = true;

-- diary_photos: drop entity_id dependency, add uploaded_by + mime_type, make entry_id nullable

-- 1. Make entry_id nullable (photos are uploaded before the entry is created)
ALTER TABLE public.diary_photos
  ALTER COLUMN entry_id DROP NOT NULL;

-- 2. Drop old entity_id FK (entities table is being retired)
ALTER TABLE public.diary_photos
  DROP COLUMN IF EXISTS entity_id;

-- 3. Add uploaded_by (FK to profiles)
ALTER TABLE public.diary_photos
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Add mime_type
ALTER TABLE public.diary_photos
  ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- 5. Update index (entity_id index is gone)
DROP INDEX IF EXISTS idx_diary_photos_entity_id;
CREATE INDEX IF NOT EXISTS idx_diary_photos_uploaded_by ON public.diary_photos(uploaded_by);

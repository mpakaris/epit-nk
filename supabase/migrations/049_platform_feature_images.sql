-- One image per landing-page feature section (slots 0-6)
CREATE TABLE public.platform_feature_images (
  slot_index  SMALLINT PRIMARY KEY CHECK (slot_index BETWEEN 0 AND 6),
  image_id    UUID REFERENCES public.image_library(id) ON DELETE SET NULL,
  image_url   TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populate all 7 slots with nulls so UPSERT always works
INSERT INTO public.platform_feature_images (slot_index)
VALUES (0),(1),(2),(3),(4),(5),(6);

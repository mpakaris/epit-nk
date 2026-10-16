-- Add room_id to diary_entries so diary entries can be assigned to a project section
ALTER TABLE public.diary_entries
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.project_rooms(id) ON DELETE SET NULL;

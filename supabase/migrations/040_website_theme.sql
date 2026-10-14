ALTER TABLE public.user_websites
  ADD COLUMN IF NOT EXISTS theme jsonb DEFAULT '{"color_scheme":"classic","typography":"modern"}';

-- Soft-delete support for profiles
-- When a member leaves: set deleted_at instead of hard-deleting.
-- Auth user gets banned; profile row stays so project memberships and
-- financial calculations remain intact.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

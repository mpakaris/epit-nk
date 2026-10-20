-- Migration 079: Scheduled account deletion
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ;

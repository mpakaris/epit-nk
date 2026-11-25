-- Migration 148: add cost_target to projects
-- Used when no offer is linked — lets the owner set a manual budget target.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cost_target numeric(12,0) DEFAULT NULL;

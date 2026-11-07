-- Migration 132: Unique constraint preventing duplicate inclusive collective on double-render
-- PostgreSQL does not allow subqueries in partial index predicates, so the original
-- approach (WHERE collective_id IN (SELECT ...)) is not viable.
-- Fix: add owner_id to collectives (backfilled from collective_members), then index it.
-- Apply via Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Step 1: add owner_id column (nullable — non-inclusive collectives don't need it)
ALTER TABLE public.collectives
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Step 2: backfill from existing inclusive collectives
UPDATE public.collectives c
SET owner_id = cm.user_id
FROM public.collective_members cm
WHERE cm.collective_id = c.id
  AND cm.role = 'owner'
  AND cm.status = 'active'
  AND c.is_inclusive = true
  AND c.owner_id IS NULL;

-- Step 3: unique partial index — one inclusive collective per owner
-- This is the race-condition guard: a second concurrent INSERT will violate this index.
CREATE UNIQUE INDEX IF NOT EXISTS one_inclusive_per_owner
ON public.collectives (owner_id)
WHERE is_inclusive = true;

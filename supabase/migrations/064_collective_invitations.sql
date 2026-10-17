-- Migration 064: Collective invitations
-- Tracks pending/accepted/declined invitations with a token for email links.

CREATE TABLE public.collective_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collective_id UUID NOT NULL REFERENCES public.collectives(id) ON DELETE CASCADE,
  invited_by    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  token         UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'declined')),
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  responded_at  TIMESTAMPTZ
);

-- Prevent duplicate pending invitations for the same email+collective
CREATE UNIQUE INDEX idx_collective_invitations_pending
  ON public.collective_invitations (collective_id, email)
  WHERE status = 'pending';

CREATE INDEX idx_collective_invitations_token      ON public.collective_invitations(token);
CREATE INDEX idx_collective_invitations_collective ON public.collective_invitations(collective_id);
CREATE INDEX idx_collective_invitations_email      ON public.collective_invitations(email);

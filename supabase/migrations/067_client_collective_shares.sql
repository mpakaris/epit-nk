-- Migration 067 — Per-client collective sharing with GDPR consent trail
-- Owner explicitly opts each client into each collective.
-- gdpr_confirmed_at records when the owner confirmed the client consented to sharing.

CREATE TABLE public.client_collective_shares (
  client_id         UUID NOT NULL REFERENCES public.clients(id)     ON DELETE CASCADE,
  collective_id     UUID NOT NULL REFERENCES public.collectives(id) ON DELETE CASCADE,
  shared_by         UUID NOT NULL REFERENCES public.profiles(id),
  gdpr_confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (client_id, collective_id)
);

CREATE INDEX idx_client_collective_shares_collective
  ON public.client_collective_shares(collective_id);

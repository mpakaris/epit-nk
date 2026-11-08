-- Migration 143: notifications, threads, messages
-- Required by: messageFeature.md Phase 1 (US-MSG-001 through US-MSG-006)

-- In-app notifications (targeted at a specific logged-in user)
CREATE TABLE public.notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT,
  link         TEXT,
  source_type  TEXT,
  source_id    UUID,
  read_at      TIMESTAMPTZ DEFAULT NULL,
  resolved_at  TIMESTAMPTZ DEFAULT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_direct_access"
  ON public.notifications
  AS RESTRICTIVE FOR ALL
  TO anon, authenticated
  USING (false);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_user_all_idx
  ON public.notifications (user_id, created_at DESC);

-- Conversation threads (client↔contractor or collective chat)
CREATE TABLE public.threads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL,
  owner_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES clients(id),
  quote_id      UUID REFERENCES quotes(id),
  project_id    UUID REFERENCES projects(id),
  collective_id UUID REFERENCES collectives(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_direct_access"
  ON public.threads
  AS RESTRICTIVE FOR ALL
  TO anon, authenticated
  USING (false);
CREATE INDEX IF NOT EXISTS threads_owner_idx
  ON public.threads (owner_id);
CREATE INDEX IF NOT EXISTS threads_client_quote_idx
  ON public.threads (client_id, quote_id)
  WHERE quote_id IS NOT NULL;

-- Messages within threads
CREATE TABLE public.messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id        UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  sender_type      TEXT NOT NULL,
  sender_user_id   UUID REFERENCES profiles(id),
  sender_client_id UUID REFERENCES clients(id),
  body             TEXT NOT NULL,
  read_at          TIMESTAMPTZ DEFAULT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_direct_access"
  ON public.messages
  AS RESTRICTIVE FOR ALL
  TO anon, authenticated
  USING (false);
CREATE INDEX IF NOT EXISTS messages_thread_created_idx
  ON public.messages (thread_id, created_at);

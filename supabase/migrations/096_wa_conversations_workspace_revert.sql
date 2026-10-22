-- Workspace context: which collective (null = personal) is active for this WA session
ALTER TABLE public.wa_conversations
  ADD COLUMN IF NOT EXISTS active_collective_id UUID REFERENCES public.collectives(id) ON DELETE SET NULL;

-- Last reversible action — cleared after 120 min or after next write action
ALTER TABLE public.wa_conversations
  ADD COLUMN IF NOT EXISTS last_action JSONB DEFAULT NULL;

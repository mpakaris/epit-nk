-- WhatsApp accounts: maps phone numbers to users (owner/members) or Subbies (WhatsApp-only)
CREATE TABLE IF NOT EXISTS public.wa_accounts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number    TEXT        NOT NULL UNIQUE,
  display_name    TEXT        NOT NULL,
  account_type    TEXT        NOT NULL CHECK (account_type IN ('owner_member', 'subbie')),
  user_id         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  collective_id   UUID        REFERENCES public.collectives(id) ON DELETE CASCADE,
  permissions     JSONB       NOT NULL DEFAULT '{}',
  is_active       BOOLEAN     NOT NULL DEFAULT false,
  verified_at     TIMESTAMPTZ,
  registered_by   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_accounts_phone       ON public.wa_accounts(phone_number);
CREATE INDEX IF NOT EXISTS idx_wa_accounts_user        ON public.wa_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_wa_accounts_collective  ON public.wa_accounts(collective_id);

-- Migration 145: portal_otps — custom 6-digit OTP for portal login (replaces Supabase OTP)
-- Required by: replace supabase.auth.signInWithOtp with our own SMTP flow

CREATE TABLE IF NOT EXISTS public.portal_otps (
  id         UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT         NOT NULL,
  code       CHAR(6)      NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL,
  used_at    TIMESTAMPTZ  DEFAULT NULL,
  created_at TIMESTAMPTZ  DEFAULT now()
);

ALTER TABLE public.portal_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_direct_access"
  ON public.portal_otps
  AS RESTRICTIVE FOR ALL
  TO anon, authenticated
  USING (false);

CREATE INDEX IF NOT EXISTS portal_otps_lookup_idx
  ON public.portal_otps (email, used_at, expires_at);

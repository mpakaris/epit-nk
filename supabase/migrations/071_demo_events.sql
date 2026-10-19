-- Demo analytics: track every interaction on the landing page and in demo mode.
-- No PII stored — session_id is an anonymous browser-tab token.
-- ip_hash is a SHA-256 of (ip + date) so the same IP on different days = different hash.

CREATE TABLE IF NOT EXISTS demo_events (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  timestamptz DEFAULT now() NOT NULL,

  session_id  text        NOT NULL,   -- random token stored in sessionStorage per tab
  ip_hash     text,                   -- SHA-256(ip || date) — daily rotation, non-reversible
  country     text,                   -- from CF-IPCountry header (if present)
  user_agent  text,                   -- raw UA for device-type breakdown

  event       text        NOT NULL,   -- 'page_view' | 'nav_click' | 'landing_click' | 'action'
  path        text,                   -- /demo/projektek
  label       text,                   -- human label: 'Projektek', 'Demo megtekintése', …
  target      text,                   -- href or action name
  props       jsonb                   -- extra context, e.g. { location: 'hero' }
);

CREATE INDEX demo_events_created_at_idx  ON demo_events (created_at DESC);
CREATE INDEX demo_events_event_idx       ON demo_events (event);
CREATE INDEX demo_events_session_id_idx  ON demo_events (session_id);
CREATE INDEX demo_events_ip_hash_idx     ON demo_events (ip_hash);

-- Invoice media: multiple receipt images per invoice
CREATE TABLE IF NOT EXISTS invoice_media (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id   UUID        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  image_url    TEXT        NOT NULL,
  storage_path TEXT,
  sort_order   INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoice_media_invoice_id_idx ON invoice_media(invoice_id);

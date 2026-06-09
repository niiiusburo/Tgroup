-- @crossref:domain[ctv]
-- @crossref:used-in[NK3 CTV discount QR staff verification]
-- @crossref:uses[product-map/domains/ctv.yaml, docs/MIGRATIONS.md]
-- 062_ctv_discount_codes.sql — discount codes for CTV QR voucher staff verify flow.
-- Canonical store: dental/auth DB (tdental_demo). Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS dbo.ctv_discount_codes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                VARCHAR(32) NOT NULL,
  ctv_partner_id      UUID NOT NULL,
  discount_value      NUMERIC(12, 2) NOT NULL DEFAULT 10,
  discount_type       VARCHAR(16) NOT NULL DEFAULT 'percent',
  status              VARCHAR(16) NOT NULL DEFAULT 'active',
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at             TIMESTAMPTZ,
  used_by_staff_id    UUID,
  used_by_staff_name  TEXT,
  customer_partner_id UUID,
  customer_lob          VARCHAR(16),
  customer_phone      TEXT,
  customer_name       TEXT,
  CONSTRAINT ctv_discount_codes_code_unique UNIQUE (code),
  CONSTRAINT ctv_discount_codes_status_check CHECK (status IN ('active', 'checked_in', 'used', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_ctv_discount_codes_ctv ON dbo.ctv_discount_codes (ctv_partner_id);
CREATE INDEX IF NOT EXISTS idx_ctv_discount_codes_status ON dbo.ctv_discount_codes (status);

COMMIT;

-- Rollback: DROP TABLE IF EXISTS dbo.ctv_discount_codes;
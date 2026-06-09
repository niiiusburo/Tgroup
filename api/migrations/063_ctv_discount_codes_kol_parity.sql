-- @crossref:domain[ctv]
-- @crossref:used-in[NK3 CTV discount QR KOL parity — per-visitor codes + tracking]
-- @crossref:uses[product-map/domains/ctv.yaml, docs/MIGRATIONS.md]
-- 063: extend ctv_discount_codes for KOL-style multi-code generation and visitor tracking.

BEGIN;

ALTER TABLE dbo.ctv_discount_codes
  ADD COLUMN IF NOT EXISTS visitor_ip TEXT,
  ADD COLUMN IF NOT EXISTS visitor_name TEXT,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generation_source VARCHAR(24);

ALTER TABLE dbo.ctv_discount_codes DROP CONSTRAINT IF EXISTS ctv_discount_codes_status_check;
ALTER TABLE dbo.ctv_discount_codes ADD CONSTRAINT ctv_discount_codes_status_check
  CHECK (status IN ('active', 'claimed', 'generated', 'checked_in', 'used', 'expired'));

CREATE INDEX IF NOT EXISTS idx_ctv_discount_codes_created
  ON dbo.ctv_discount_codes (ctv_partner_id, created_at DESC);

COMMIT;

-- Rollback:
-- ALTER TABLE dbo.ctv_discount_codes DROP COLUMN IF EXISTS visitor_ip;
-- ALTER TABLE dbo.ctv_discount_codes DROP COLUMN IF EXISTS visitor_name;
-- ALTER TABLE dbo.ctv_discount_codes DROP COLUMN IF EXISTS claimed_at;
-- ALTER TABLE dbo.ctv_discount_codes DROP COLUMN IF EXISTS checked_in_at;
-- ALTER TABLE dbo.ctv_discount_codes DROP COLUMN IF EXISTS generation_source;
-- DROP INDEX IF EXISTS idx_ctv_discount_codes_created;
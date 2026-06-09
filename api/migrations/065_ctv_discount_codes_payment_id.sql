-- @crossref:domain[ctv]
-- @crossref:used-in[NK3 CTV QR discount Phase 2 — payment linkage]
-- @crossref:uses[product-map/domains/ctv.yaml, docs/MIGRATIONS.md]
-- 065: Add payment_id to ctv_discount_codes for auto-complete on payment.

BEGIN;

ALTER TABLE dbo.ctv_discount_codes
  ADD COLUMN IF NOT EXISTS payment_id UUID;

CREATE INDEX IF NOT EXISTS idx_ctv_discount_codes_payment
  ON dbo.ctv_discount_codes (payment_id);

COMMIT;

-- Rollback:
-- ALTER TABLE dbo.ctv_discount_codes DROP COLUMN IF EXISTS payment_id;
-- DROP INDEX IF EXISTS idx_ctv_discount_codes_payment;

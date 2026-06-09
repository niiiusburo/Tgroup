-- @crossref:domain[ctv]
-- @crossref:used-in[NK3 schema migration: api/migrations/052_add_saleorder_ctv]
-- @crossref:uses[product-map/domains/ctv.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- 052_add_saleorder_ctv.sql
-- Per-service CTV attribution (commission engine v3).
--
-- The CTV is now attached to a SPECIFIC service (saleorder), not to the customer.
-- Commission = commission_level_config levels applied directly to the paid amount,
-- attributed to this CTV (level 0) + their upline chain (levels 1..N). A service with
-- no ctv_id earns no commission (explicit attribution only).
--
-- Nullable + no hard FK on purpose: a saleorder lives in one LOB DB while a CTV exists
-- in both; the engine validates/walks the chain at write time, and a dangling id simply
-- yields no chain → no commission (fails safe). Idempotent: re-runnable on every DB.

ALTER TABLE dbo.saleorders ADD COLUMN IF NOT EXISTS ctv_id uuid;

CREATE INDEX IF NOT EXISTS idx_saleorders_ctv_id
  ON dbo.saleorders (ctv_id)
  WHERE ctv_id IS NOT NULL;

COMMENT ON COLUMN dbo.saleorders.ctv_id IS
  'CTV (partners.id, is_ctv=true) attached to THIS service. Drives per-service commission: level% of the paid amount to this CTV + upline chain. NULL = no commission.';

-- @crossref:domain[ctv]
-- @crossref:used-in[NK3 schema migration: api/migrations/053_drop_default_referral_percent]
-- @crossref:uses[product-map/domains/ctv.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- 053_drop_default_referral_percent.sql
-- Commission is levels-only (engine v3): the global "default referral %" is gone.
-- Drop default_referral_percent from commission_settings. The singleton row stays
-- (referral_start_product_id — used by the Referral Start card — is untouched).
-- Idempotent.

ALTER TABLE dbo.commission_settings DROP COLUMN IF EXISTS default_referral_percent;

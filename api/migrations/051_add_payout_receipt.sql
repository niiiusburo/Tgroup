-- @crossref:domain[earnings-commissions]
-- @crossref:used-in[NK3 schema migration: api/migrations/051_add_payout_receipt]
-- @crossref:uses[product-map/domains/earnings-commissions.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- Migration 051: Add receipt columns to dbo.payouts
-- Applies to both dental and cosmetic DBs.
-- Guarded by to_regclass check for demo DBs without schema_migrations tracking.

ALTER TABLE dbo.payouts
  ADD COLUMN IF NOT EXISTS receipt_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMPTZ NULL;

DO $$ BEGIN
  IF to_regclass('dbo.schema_migrations') IS NOT NULL THEN
    INSERT INTO dbo.schema_migrations (filename, applied_at)
    VALUES ('051_add_payout_receipt.sql', now())
    ON CONFLICT (filename) DO NOTHING;
  END IF;
END $$;

-- Migration 051: Add receipt columns to dbo.payouts
-- Applies to both dental and cosmetic DBs.
-- Guarded by schema_migrations insert (additive, no destructive changes).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM schema_migrations WHERE version = '051'
  ) THEN
    ALTER TABLE dbo.payouts
      ADD COLUMN IF NOT EXISTS receipt_url TEXT NULL,
      ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMPTZ NULL;

    INSERT INTO schema_migrations (version, applied_at)
    VALUES ('051', NOW());
  END IF;
END $$;

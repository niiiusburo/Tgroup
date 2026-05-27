-- Migration 050: Add signature_image and created_via to partners
-- Applied to BOTH tdental_demo AND tcosmetic_demo

BEGIN;

-- Add signature_image column (base64 PNG, compressed to ≤30KB)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dbo' AND table_name = 'partners' AND column_name = 'signature_image'
  ) THEN
    ALTER TABLE dbo.partners ADD COLUMN signature_image TEXT;
  END IF;
END $$;

-- Add created_via column with CHECK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dbo' AND table_name = 'partners' AND column_name = 'created_via'
  ) THEN
    ALTER TABLE dbo.partners ADD COLUMN created_via VARCHAR(16) DEFAULT 'admin_create';
  END IF;
END $$;

-- Add CHECK constraint (idempotent: drop then add to avoid duplicate constraint errors)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'dbo' AND table_name = 'partners'
    AND constraint_name = 'partners_created_via_check'
  ) THEN
    ALTER TABLE dbo.partners DROP CONSTRAINT partners_created_via_check;
  END IF;
END $$;

ALTER TABLE dbo.partners
  ADD CONSTRAINT partners_created_via_check
  CHECK (created_via IN ('self_signup', 'admin_create', 'migrated'));

-- Backfill existing rows to 'migrated'
UPDATE dbo.partners
SET created_via = 'migrated'
WHERE created_via IS NULL;

COMMIT;

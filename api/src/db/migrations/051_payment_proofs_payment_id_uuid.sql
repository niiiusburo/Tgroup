-- Migration 051: fix dbo.payment_proofs.payment_id type from integer → uuid.
--
-- Bug: the original 002_payment_proofs migration declared payment_id as integer,
-- but dbo.payments.id is uuid. There is no FK constraint, so the broken type
-- went undetected. Every upload via POST /api/Payments/:id/proof has failed at
-- the database driver with "invalid input syntax for type integer" because the
-- handler passes the URL :id (uuid string) to a $1 placeholder bound to an int
-- column. As a result, dbo.payment_proofs has 0 rows in production and the
-- entire payment verification feature has never functioned end-to-end.
--
-- Safe to run on prod: the table is empty (no data migration). We drop the
-- broken integer column, recreate it as uuid, add the missing FK to payments,
-- and recreate the (payment_id, confirmed_at) index referenced by the cash-flow
-- query.
--
-- Idempotent: DO blocks check current state before each step, so re-running
-- after partial success or on environments already migrated is a no-op.

BEGIN;

-- 1. Column type swap. Only runs if payment_id is currently integer.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'dbo'
      AND table_name = 'payment_proofs'
      AND column_name = 'payment_id'
      AND data_type = 'integer'
  ) THEN
    -- Drop the broken int sequence default before dropping the column.
    ALTER TABLE dbo.payment_proofs DROP COLUMN payment_id;
    ALTER TABLE dbo.payment_proofs ADD COLUMN payment_id uuid;
  END IF;
END $$;

-- 2. Foreign key. Only adds if not already present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'dbo'
      AND table_name = 'payment_proofs'
      AND constraint_name = 'fk_payment_proofs_payment'
  ) THEN
    ALTER TABLE dbo.payment_proofs
      ADD CONSTRAINT fk_payment_proofs_payment
      FOREIGN KEY (payment_id) REFERENCES dbo.payments(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Index for cash-flow query and confirm-latest-proof lookup.
DROP INDEX IF EXISTS dbo.idx_payment_proofs_payment_confirmed;
CREATE INDEX idx_payment_proofs_payment_confirmed
  ON dbo.payment_proofs (payment_id, confirmed_at);

COMMIT;

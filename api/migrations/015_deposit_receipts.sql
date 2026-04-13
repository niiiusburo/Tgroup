-- Migration: Add deposit receipt tracking and refund support
-- Adds receipt_number, deposit_type to payments and a receipt_sequences table

-- 1. Receipt sequence table for TUKH/YYYY/NNNNN numbering
CREATE TABLE IF NOT EXISTS receipt_sequences (
  id SERIAL PRIMARY KEY,
  prefix VARCHAR(10) NOT NULL DEFAULT 'TUKH',
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  UNIQUE(prefix, year)
);

-- 2. Add receipt_number and deposit_type to payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS receipt_number TEXT,
  ADD COLUMN IF NOT EXISTS deposit_type VARCHAR(20);

-- Optional: add a check constraint for valid deposit types
-- We do this as a separate step so it doesn't fail if applied to existing rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_payments_deposit_type'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT chk_payments_deposit_type
      CHECK (deposit_type IS NULL OR deposit_type IN ('deposit', 'refund', 'usage'));
  END IF;
END
$$;

-- 3. Indexes for filtering/searching deposits
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payments_deposit_type ON payments(deposit_type);

-- 4. Backfill legacy deposit top-ups so they can be queried explicitly
UPDATE payments
SET deposit_type = 'deposit'
WHERE deposit_type IS NULL
  AND method IN ('cash', 'bank_transfer')
  AND record_id IS NULL
  AND (deposit_used IS NULL OR deposit_used = 0)
  AND amount > 0;

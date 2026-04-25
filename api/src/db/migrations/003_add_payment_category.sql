-- Migration: Add payment_category column to eliminate heuristic classification
-- The current GET/POST /api/Payments uses 64 lines of fragile SQL heuristics
-- to classify payments vs deposits. This column makes it explicit.

BEGIN;

-- 1. Add column (nullable initially for backfill)
ALTER TABLE dbo.payments
ADD COLUMN IF NOT EXISTS payment_category VARCHAR(20);

-- 2. Backfill: classify existing rows using the CURRENT heuristic logic
-- This replicates the exact classification from payments.js GET route

-- DEPOSITS: deposit_type is 'deposit' or 'refund'
UPDATE dbo.payments
SET payment_category = 'deposit'
WHERE deposit_type IN ('deposit', 'refund')
  AND payment_category IS NULL;

-- DEPOSITS: heuristic fallback (no deposit_type but looks like a deposit)
UPDATE dbo.payments
SET payment_category = 'deposit'
WHERE payment_category IS NULL
  AND deposit_type IS NULL
  AND method IN ('cash', 'bank_transfer')
  AND service_id IS NULL
  AND (deposit_used IS NULL OR deposit_used = 0)
  AND amount > 0
  AND NOT EXISTS (SELECT 1 FROM dbo.payment_allocations WHERE payment_id = payments.id);

-- PAYMENTS: has allocations (always a payment regardless of other fields)
UPDATE dbo.payments
SET payment_category = 'payment'
WHERE payment_category IS NULL
  AND EXISTS (SELECT 1 FROM dbo.payment_allocations WHERE payment_id = payments.id);

-- PAYMENTS: remaining (void, negative amounts, deposit method, usage)
UPDATE dbo.payments
SET payment_category = 'payment'
WHERE payment_category IS NULL;

-- 3. Add CHECK constraint
ALTER TABLE dbo.payments
ADD CONSTRAINT chk_payment_category
CHECK (payment_category IN ('payment', 'deposit'));

-- 4. Fix NOT NULL (after backfill is complete)
ALTER TABLE dbo.payments
ALTER COLUMN payment_category SET NOT NULL;

-- 5. Index for filtering
CREATE INDEX IF NOT EXISTS idx_payments_category ON dbo.payments(payment_category);

COMMIT;

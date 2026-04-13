-- Migration: Make payments strictly per-record (single saleorder or dotkham)
-- Step 1: Add record linkage columns to payments
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS record_id UUID,
ADD COLUMN IF NOT EXISTS record_type VARCHAR(20);

-- Step 2: Backfill from existing payment_allocations (first allocation wins for historical rows)
UPDATE payments p
SET record_id = pa.invoice_id,
    record_type = 'saleorder'
FROM payment_allocations pa
WHERE p.id = pa.payment_id
  AND p.record_id IS NULL
  AND pa.invoice_id IS NOT NULL;

UPDATE payments p
SET record_id = pa.dotkham_id,
    record_type = 'dotkham'
FROM payment_allocations pa
WHERE p.id = pa.payment_id
  AND p.record_id IS NULL
  AND pa.dotkham_id IS NOT NULL;

-- Step 3: Add index for performance
CREATE INDEX IF NOT EXISTS idx_payments_record ON payments(record_id, record_type);

-- Step 4: Add record linkage to monthlyplans (single record per plan)
ALTER TABLE monthlyplans
ADD COLUMN IF NOT EXISTS record_id UUID,
ADD COLUMN IF NOT EXISTS record_type VARCHAR(20);

-- Step 5: Backfill monthlyplans from monthlyplan_items (first linked invoice wins)
UPDATE monthlyplans mp
SET record_id = mpi.invoice_id,
    record_type = 'saleorder'
FROM monthlyplan_items mpi
WHERE mp.id = mpi.plan_id
  AND mp.record_id IS NULL;

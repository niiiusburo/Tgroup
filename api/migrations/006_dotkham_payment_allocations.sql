SET search_path = dbo, public;

-- Remove any partially-created column first
ALTER TABLE payment_allocations
DROP COLUMN IF EXISTS dotkham_id;

-- Payment allocation ledger expansion: support dotkham allocations
-- NOTE: dotkhams is a VIEW in the demo schema, so we cannot add a FK reference to it.
ALTER TABLE payment_allocations
ADD COLUMN dotkham_id UUID;

-- Remove old target constraint if exists
ALTER TABLE payment_allocations
DROP CONSTRAINT IF EXISTS chk_payment_allocation_target;

-- Enforce exactly one target is set (or both null)
ALTER TABLE payment_allocations
ADD CONSTRAINT chk_payment_allocation_target
CHECK (
    (invoice_id IS NOT NULL AND dotkham_id IS NULL)
    OR (invoice_id IS NULL AND dotkham_id IS NOT NULL)
    OR (invoice_id IS NULL AND dotkham_id IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_dotkham_id ON payment_allocations(dotkham_id);

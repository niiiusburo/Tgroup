-- Migration: Add sale order status audit logging and state constraint
-- ============================================================================

-- 1. Audit log table for sale order state changes
CREATE TABLE IF NOT EXISTS saleorder_state_logs (
  id UUID PRIMARY KEY,
  saleorder_id UUID NOT NULL REFERENCES saleorders(id) ON DELETE CASCADE,
  old_state TEXT,
  new_state TEXT NOT NULL,
  changed_by TEXT,
  changed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saleorder_state_logs_saleorder_id ON saleorder_state_logs(saleorder_id);
CREATE INDEX IF NOT EXISTS idx_saleorder_state_logs_changed_at ON saleorder_state_logs(changed_at);

-- 2. Add CHECK constraint to saleorders.state to prevent invalid values
-- We use a separate alter because the column already exists.
-- If the constraint already exists, this will fail silently in some setups,
-- so we wrap it in a DO block for idempotency on Postgres.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'saleorders'
      AND constraint_name = 'chk_saleorders_state'
  ) THEN
    ALTER TABLE saleorders
      ADD CONSTRAINT chk_saleorders_state
      CHECK (state IS NULL OR state IN ('sale', 'done', 'cancel', 'draft'));
  END IF;
END
$$;

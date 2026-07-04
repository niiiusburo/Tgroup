-- Migration 047: Payment proof receipt confirmation
-- Adds confirmation metadata so receipt proofs can be confirmed by privileged staff.

BEGIN;

ALTER TABLE dbo.payment_proofs
  ADD COLUMN IF NOT EXISTS confirmed_at timestamp without time zone NULL,
  ADD COLUMN IF NOT EXISTS confirmed_by uuid NULL;

-- Best-effort FK (partners table owns employees too). Keep nullable for historical rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_schema = 'dbo'
      AND tc.table_name = 'payment_proofs'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'fk_payment_proofs_confirmed_by'
  ) THEN
    ALTER TABLE dbo.payment_proofs
      ADD CONSTRAINT fk_payment_proofs_confirmed_by
      FOREIGN KEY (confirmed_by) REFERENCES dbo.partners(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_proofs_payment_confirmed
  ON dbo.payment_proofs(payment_id, confirmed_at);

COMMIT;


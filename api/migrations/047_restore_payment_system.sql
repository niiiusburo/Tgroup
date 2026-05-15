-- Restore payment deposit classification and destructive payment permissions.
-- This migration is idempotent and safe to re-run.

BEGIN;

UPDATE dbo.payments
SET payment_category = 'deposit'
WHERE deposit_type IN ('deposit', 'refund')
  AND (payment_category IS NULL OR payment_category <> 'deposit');

INSERT INTO dbo.group_permissions (group_id, permission)
SELECT pg.id, 'payment.void'
FROM dbo.permission_groups pg
WHERE pg.name IN ('Super Admin', 'Admin')
ON CONFLICT (group_id, permission) DO NOTHING;

COMMIT;

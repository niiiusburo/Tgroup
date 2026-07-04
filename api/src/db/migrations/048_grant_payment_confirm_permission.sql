-- Migration 048: Grant payment.confirm to Dentist + Super Admin (not Admin)

BEGIN;

INSERT INTO dbo.group_permissions (group_id, permission)
SELECT pg.id, 'payment.confirm'
FROM dbo.permission_groups pg
WHERE pg.name IN ('Dentist', 'Super Admin')
ON CONFLICT DO NOTHING;

COMMIT;


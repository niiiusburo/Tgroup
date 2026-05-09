-- Migration 049: Seed Hosoonline split permissions in the deploy-applied folder.
-- Patient creation is restricted to manager/admin roles, while image upload is
-- available to admin and assistant roles that handle online records.

BEGIN;

INSERT INTO dbo.group_permissions (group_id, permission)
SELECT pg.id, 'external_checkups.create'
FROM dbo.permission_groups pg
WHERE pg.name IN ('Super Admin', 'Admin', 'Clinic Manager')
ON CONFLICT DO NOTHING;

INSERT INTO dbo.group_permissions (group_id, permission)
SELECT pg.id, 'external_checkups.upload'
FROM dbo.permission_groups pg
WHERE pg.name IN ('Super Admin', 'Admin', 'Dental Assistant', 'Assistant')
ON CONFLICT DO NOTHING;

DELETE FROM dbo.group_permissions gp
USING dbo.permission_groups pg
WHERE gp.group_id = pg.id
  AND gp.permission = 'external_checkups.create'
  AND pg.name IN ('Receptionist', 'Dentist', 'Dental Assistant', 'Assistant');

DELETE FROM dbo.group_permissions gp
USING dbo.permission_groups pg
WHERE gp.group_id = pg.id
  AND gp.permission = 'external_checkups.upload'
  AND pg.name IN ('Receptionist', 'Dentist');

COMMIT;

-- Grant Hosoonline patient/checkup creation to operational clinic roles.
-- Admin already has this permission via 028_lock_super_admin_permissions.sql.

INSERT INTO dbo.group_permissions (group_id, permission)
SELECT pg.id, 'external_checkups.create'
FROM dbo.permission_groups pg
WHERE pg.name IN ('Clinic Manager', 'Dentist', 'Receptionist', 'Dental Assistant')
ON CONFLICT (group_id, permission) DO NOTHING;

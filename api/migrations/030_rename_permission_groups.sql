-- Rename permission groups from old dental-specific names to generic tier names
UPDATE dbo.permission_groups SET name = 'Super Admin', description = 'Full system access (super administrator)' WHERE id = '11111111-0000-0000-0000-000000000001';
UPDATE dbo.permission_groups SET name = 'Admin', description = 'Clinic administration access' WHERE id = '11111111-0000-0000-0000-000000000002';
UPDATE dbo.permission_groups SET name = 'Editor', description = 'Editor access' WHERE id = '11111111-0000-0000-0000-000000000003';
-- Receptionist stays the same name
UPDATE dbo.permission_groups SET name = 'Receptionist', description = 'Front desk access' WHERE id = '11111111-0000-0000-0000-000000000004';
UPDATE dbo.permission_groups SET name = 'Assistant', description = 'Assistant access' WHERE id = '11111111-0000-0000-0000-000000000005';

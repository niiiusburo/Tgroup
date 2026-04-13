-- Migration: Add external_checkups.view permission to all existing permission groups
-- This ensures backward compatibility so existing roles can view health checkup images.
-- Admins can later revoke this permission from specific groups via Settings → Roles.

INSERT INTO group_permissions (group_id, permission)
SELECT pg.id, 'external_checkups.view'
FROM permission_groups pg
ON CONFLICT (group_id, permission) DO NOTHING;

-- Corrected for VPS: schema-qualified tables (API uses search_path=dbo, psql direct needs explicit schema)
INSERT INTO dbo.group_permissions (group_id, permission)
SELECT pg.id, 'external_checkups.view'
FROM dbo.permission_groups pg
ON CONFLICT (group_id, permission) DO NOTHING;

-- Migration: Add operational Excel export permissions
-- Grants to all existing permission groups so admins can configure access via Settings → Roles.

DO $$
DECLARE
    v_admin_id UUID := '11111111-0000-0000-0000-000000000001';
BEGIN
    -- Admin group gets all export permissions
    INSERT INTO group_permissions (group_id, permission)
    VALUES
        (v_admin_id, 'customers.export'),
        (v_admin_id, 'appointments.export'),
        (v_admin_id, 'services.export'),
        (v_admin_id, 'payments.export'),
        (v_admin_id, 'products.export')
    ON CONFLICT (group_id, permission) DO NOTHING;

    INSERT INTO dbo.group_permissions (group_id, permission)
    VALUES
        (v_admin_id, 'customers.export'),
        (v_admin_id, 'appointments.export'),
        (v_admin_id, 'services.export'),
        (v_admin_id, 'payments.export'),
        (v_admin_id, 'products.export')
    ON CONFLICT (group_id, permission) DO NOTHING;
END $$;

-- Other groups get products.export only (lowest-risk catalog data)
INSERT INTO group_permissions (group_id, permission)
SELECT pg.id, 'products.export'
FROM permission_groups pg
WHERE pg.id != '11111111-0000-0000-0000-000000000001'
ON CONFLICT (group_id, permission) DO NOTHING;

INSERT INTO dbo.group_permissions (group_id, permission)
SELECT pg.id, 'products.export'
FROM dbo.permission_groups pg
WHERE pg.id != '11111111-0000-0000-0000-000000000001'
ON CONFLICT (group_id, permission) DO NOTHING;

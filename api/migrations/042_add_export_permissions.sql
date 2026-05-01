-- Migration: Add operational Excel export permissions
-- Grants to all existing permission groups so admins can configure access via Settings -> Roles.

DO $$
DECLARE
    v_admin_id UUID := '11111111-0000-0000-0000-000000000001';
BEGIN
    -- Admin group gets all export permissions in deployments that still use public tables.
    IF to_regclass('public.group_permissions') IS NOT NULL THEN
        INSERT INTO public.group_permissions (group_id, permission)
        VALUES
            (v_admin_id, 'customers.export'),
            (v_admin_id, 'appointments.export'),
            (v_admin_id, 'services.export'),
            (v_admin_id, 'payments.export'),
            (v_admin_id, 'products.export')
        ON CONFLICT (group_id, permission) DO NOTHING;
    END IF;

    IF to_regclass('dbo.group_permissions') IS NOT NULL THEN
        INSERT INTO dbo.group_permissions (group_id, permission)
        VALUES
            (v_admin_id, 'customers.export'),
            (v_admin_id, 'appointments.export'),
            (v_admin_id, 'services.export'),
            (v_admin_id, 'payments.export'),
            (v_admin_id, 'products.export')
        ON CONFLICT (group_id, permission) DO NOTHING;
    END IF;

    -- Other groups get products.export only (lowest-risk catalog data).
    IF to_regclass('public.group_permissions') IS NOT NULL
       AND to_regclass('public.permission_groups') IS NOT NULL THEN
        INSERT INTO public.group_permissions (group_id, permission)
        SELECT pg.id, 'products.export'
        FROM public.permission_groups pg
        WHERE pg.id != v_admin_id
        ON CONFLICT (group_id, permission) DO NOTHING;
    END IF;

    IF to_regclass('dbo.group_permissions') IS NOT NULL
       AND to_regclass('dbo.permission_groups') IS NOT NULL THEN
        INSERT INTO dbo.group_permissions (group_id, permission)
        SELECT pg.id, 'products.export'
        FROM dbo.permission_groups pg
        WHERE pg.id != v_admin_id
        ON CONFLICT (group_id, permission) DO NOTHING;
    END IF;
END $$;

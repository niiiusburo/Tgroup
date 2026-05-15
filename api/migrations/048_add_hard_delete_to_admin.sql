-- Migration: Ensure Admin/Super Admin groups have customers.hard_delete permission
-- Fixes: Admin missing customers.hard_delete blocks hard-delete API

DO $$
DECLARE
    v_admin_id UUID := '11111111-0000-0000-0000-000000000001';
BEGIN
    -- public schema
    IF to_regclass('public.group_permissions') IS NOT NULL THEN
        INSERT INTO public.group_permissions (group_id, permission)
        VALUES (v_admin_id, 'customers.hard_delete')
        ON CONFLICT (group_id, permission) DO NOTHING;
    END IF;

    -- dbo schema (Docker/VPS)
    IF to_regclass('dbo.group_permissions') IS NOT NULL THEN
        INSERT INTO dbo.group_permissions (group_id, permission)
        VALUES (v_admin_id, 'customers.hard_delete')
        ON CONFLICT (group_id, permission) DO NOTHING;
    END IF;
END $$;

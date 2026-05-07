-- Migration: Add payment.confirm permission to Admin group
-- Dentists will need this permission assigned via Settings -> Roles

DO $$
DECLARE
    v_admin_id UUID := '11111111-0000-0000-0000-000000000001';
BEGIN
    -- Admin group gets payment.confirm in public schema
    IF to_regclass('public.group_permissions') IS NOT NULL THEN
        INSERT INTO public.group_permissions (group_id, permission)
        VALUES (v_admin_id, 'payment.confirm')
        ON CONFLICT (group_id, permission) DO NOTHING;
    END IF;

    -- Same for dbo schema (VPS compatibility)
    IF to_regclass('dbo.group_permissions') IS NOT NULL THEN
        INSERT INTO dbo.group_permissions (group_id, permission)
        VALUES (v_admin_id, 'payment.confirm')
        ON CONFLICT (group_id, permission) DO NOTHING;
    END IF;
END $$;

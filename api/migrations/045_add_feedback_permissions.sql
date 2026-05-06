-- Migration: Add scoped feedback admin permissions to the super-admin group.
-- Other groups can be granted these explicitly from the permission board.

DO $$
DECLARE
    v_admin_id UUID := '11111111-0000-0000-0000-000000000001';
BEGIN
    IF to_regclass('public.group_permissions') IS NOT NULL THEN
        INSERT INTO public.group_permissions (group_id, permission)
        VALUES
            (v_admin_id, 'feedback.view'),
            (v_admin_id, 'feedback.reply'),
            (v_admin_id, 'feedback.edit'),
            (v_admin_id, 'feedback.delete')
        ON CONFLICT (group_id, permission) DO NOTHING;
    END IF;

    IF to_regclass('dbo.group_permissions') IS NOT NULL THEN
        INSERT INTO dbo.group_permissions (group_id, permission)
        VALUES
            (v_admin_id, 'feedback.view'),
            (v_admin_id, 'feedback.reply'),
            (v_admin_id, 'feedback.edit'),
            (v_admin_id, 'feedback.delete')
        ON CONFLICT (group_id, permission) DO NOTHING;
    END IF;
END $$;

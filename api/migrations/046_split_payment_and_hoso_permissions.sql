-- Split coarse payment and Hosoonline permissions into safer action-level grants.
-- Super Admin/Admin keep destructive payment and upload access. Assistant-facing
-- roles keep online-record upload access, but patient creation stays restricted.

DO $$
BEGIN
    IF to_regclass('public.group_permissions') IS NOT NULL
       AND to_regclass('public.permission_groups') IS NOT NULL THEN
        INSERT INTO public.group_permissions (group_id, permission)
        SELECT pg.id, 'payment.add'
        FROM public.permission_groups pg
        WHERE pg.name IN ('Super Admin', 'Admin', 'Clinic Manager', 'Receptionist', 'Dentist', 'Dental Assistant', 'Assistant')
        ON CONFLICT (group_id, permission) DO NOTHING;

        INSERT INTO public.group_permissions (group_id, permission)
        SELECT pg.id, 'payment.void'
        FROM public.permission_groups pg
        WHERE pg.name IN ('Super Admin', 'Admin')
        ON CONFLICT (group_id, permission) DO NOTHING;

        INSERT INTO public.group_permissions (group_id, permission)
        SELECT pg.id, 'external_checkups.upload'
        FROM public.permission_groups pg
        WHERE pg.name IN ('Super Admin', 'Admin', 'Dental Assistant', 'Assistant')
        ON CONFLICT (group_id, permission) DO NOTHING;

        DELETE FROM public.group_permissions gp
        USING public.permission_groups pg
        WHERE gp.group_id = pg.id
          AND gp.permission = 'external_checkups.create'
          AND pg.name IN ('Receptionist', 'Dentist', 'Dental Assistant', 'Assistant');

        DELETE FROM public.group_permissions gp
        USING public.permission_groups pg
        WHERE gp.group_id = pg.id
          AND gp.permission = 'external_checkups.upload'
          AND pg.name IN ('Receptionist', 'Dentist');
    END IF;

    IF to_regclass('dbo.group_permissions') IS NOT NULL
       AND to_regclass('dbo.permission_groups') IS NOT NULL THEN
        INSERT INTO dbo.group_permissions (group_id, permission)
        SELECT pg.id, 'payment.add'
        FROM dbo.permission_groups pg
        WHERE pg.name IN ('Super Admin', 'Admin', 'Clinic Manager', 'Receptionist', 'Dentist', 'Dental Assistant', 'Assistant')
        ON CONFLICT (group_id, permission) DO NOTHING;

        INSERT INTO dbo.group_permissions (group_id, permission)
        SELECT pg.id, 'payment.void'
        FROM dbo.permission_groups pg
        WHERE pg.name IN ('Super Admin', 'Admin')
        ON CONFLICT (group_id, permission) DO NOTHING;

        INSERT INTO dbo.group_permissions (group_id, permission)
        SELECT pg.id, 'external_checkups.upload'
        FROM dbo.permission_groups pg
        WHERE pg.name IN ('Super Admin', 'Admin', 'Dental Assistant', 'Assistant')
        ON CONFLICT (group_id, permission) DO NOTHING;

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
    END IF;
END $$;

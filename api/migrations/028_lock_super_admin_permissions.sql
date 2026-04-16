-- Migration: Ensure the system Admin (super admin) group has every single permission.
-- This locks the super admin role with full access and prevents partial permission gaps.

DO $$
DECLARE
    v_admin_id UUID := '11111111-0000-0000-0000-000000000001';
BEGIN
    -- Insert all known permissions for the Admin group
    INSERT INTO group_permissions (group_id, permission)
    VALUES
        (v_admin_id, 'overview.view'),
        (v_admin_id, 'calendar.view'),
        (v_admin_id, 'calendar.edit'),
        (v_admin_id, 'customers.view'),
        (v_admin_id, 'customers.view_all'),
        (v_admin_id, 'customers.add'),
        (v_admin_id, 'customers.edit'),
        (v_admin_id, 'customers.delete'),
        (v_admin_id, 'customers.hard_delete'),
        (v_admin_id, 'appointments.view'),
        (v_admin_id, 'appointments.add'),
        (v_admin_id, 'appointments.edit'),
        (v_admin_id, 'services.view'),
        (v_admin_id, 'services.add'),
        (v_admin_id, 'services.edit'),
        (v_admin_id, 'payment.view'),
        (v_admin_id, 'payment.add'),
        (v_admin_id, 'payment.edit'),
        (v_admin_id, 'payment.refund'),
        (v_admin_id, 'employees.view'),
        (v_admin_id, 'employees.add'),
        (v_admin_id, 'employees.edit'),
        (v_admin_id, 'locations.view'),
        (v_admin_id, 'locations.add'),
        (v_admin_id, 'locations.edit'),
        (v_admin_id, 'reports.view'),
        (v_admin_id, 'reports.export'),
        (v_admin_id, 'commission.view'),
        (v_admin_id, 'commission.edit'),
        (v_admin_id, 'settings.view'),
        (v_admin_id, 'settings.edit'),
        (v_admin_id, 'notifications.view'),
        (v_admin_id, 'notifications.edit'),
        (v_admin_id, 'permissions.view'),
        (v_admin_id, 'permissions.edit'),
        (v_admin_id, 'relationships.view'),
        (v_admin_id, 'website.view'),
        (v_admin_id, 'website.edit'),
        (v_admin_id, 'external_checkups.view'),
        (v_admin_id, 'external_checkups.create')
    ON CONFLICT (group_id, permission) DO NOTHING;

    -- Same for dbo schema (VPS compatibility)
    INSERT INTO dbo.group_permissions (group_id, permission)
    VALUES
        (v_admin_id, 'overview.view'),
        (v_admin_id, 'calendar.view'),
        (v_admin_id, 'calendar.edit'),
        (v_admin_id, 'customers.view'),
        (v_admin_id, 'customers.view_all'),
        (v_admin_id, 'customers.add'),
        (v_admin_id, 'customers.edit'),
        (v_admin_id, 'customers.delete'),
        (v_admin_id, 'customers.hard_delete'),
        (v_admin_id, 'appointments.view'),
        (v_admin_id, 'appointments.add'),
        (v_admin_id, 'appointments.edit'),
        (v_admin_id, 'services.view'),
        (v_admin_id, 'services.add'),
        (v_admin_id, 'services.edit'),
        (v_admin_id, 'payment.view'),
        (v_admin_id, 'payment.add'),
        (v_admin_id, 'payment.edit'),
        (v_admin_id, 'payment.refund'),
        (v_admin_id, 'employees.view'),
        (v_admin_id, 'employees.add'),
        (v_admin_id, 'employees.edit'),
        (v_admin_id, 'locations.view'),
        (v_admin_id, 'locations.add'),
        (v_admin_id, 'locations.edit'),
        (v_admin_id, 'reports.view'),
        (v_admin_id, 'reports.export'),
        (v_admin_id, 'commission.view'),
        (v_admin_id, 'commission.edit'),
        (v_admin_id, 'settings.view'),
        (v_admin_id, 'settings.edit'),
        (v_admin_id, 'notifications.view'),
        (v_admin_id, 'notifications.edit'),
        (v_admin_id, 'permissions.view'),
        (v_admin_id, 'permissions.edit'),
        (v_admin_id, 'relationships.view'),
        (v_admin_id, 'website.view'),
        (v_admin_id, 'website.edit'),
        (v_admin_id, 'external_checkups.view'),
        (v_admin_id, 'external_checkups.create')
    ON CONFLICT (group_id, permission) DO NOTHING;
END $$;

-- Migration: Seed preset permission groups
-- Creates Super Admin, Admin, Receptionist, Dentist, Dental Assistant
-- if they do not already exist. Idempotent — safe to re-run.

DO $$
DECLARE
  v_super_admin_id UUID;
  v_admin_id UUID;
  v_receptionist_id UUID;
  v_dentist_id UUID;
  v_assistant_id UUID;
BEGIN
  -- Super Admin
  INSERT INTO permission_groups (id, name, color, description, is_system)
  VALUES (gen_random_uuid(), 'Super Admin', '#EF4444', 'Full system access', true)
  ON CONFLICT (name) DO NOTHING
  RETURNING id INTO v_super_admin_id;

  IF v_super_admin_id IS NOT NULL THEN
    INSERT INTO group_permissions (group_id, permission) VALUES (v_super_admin_id, '*');
  END IF;

  -- Admin
  INSERT INTO permission_groups (id, name, color, description, is_system)
  VALUES (gen_random_uuid(), 'Admin', '#F97316', 'Administrator with full operational access', true)
  ON CONFLICT (name) DO NOTHING
  RETURNING id INTO v_admin_id;

  IF v_admin_id IS NOT NULL THEN
    INSERT INTO group_permissions (group_id, permission) VALUES
      (v_admin_id, 'overview.view'),
      (v_admin_id, 'calendar.view'),
      (v_admin_id, 'calendar.edit'),
      (v_admin_id, 'customers.view'),
      (v_admin_id, 'customers.view_all'),
      (v_admin_id, 'customers.add'),
      (v_admin_id, 'customers.edit'),
      (v_admin_id, 'customers.delete'),
      (v_admin_id, 'customers.hard_delete'),
      (v_admin_id, 'customers.export'),
      (v_admin_id, 'appointments.view'),
      (v_admin_id, 'appointments.add'),
      (v_admin_id, 'appointments.edit'),
      (v_admin_id, 'appointments.export'),
      (v_admin_id, 'services.view'),
      (v_admin_id, 'services.add'),
      (v_admin_id, 'services.edit'),
      (v_admin_id, 'services.export'),
      (v_admin_id, 'products.export'),
      (v_admin_id, 'payment.view'),
      (v_admin_id, 'payment.add'),
      (v_admin_id, 'payment.edit'),
      (v_admin_id, 'payment.refund'),
      (v_admin_id, 'payment.void'),
      (v_admin_id, 'payment.confirm'),
      (v_admin_id, 'payments.export'),
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
    ON CONFLICT DO NOTHING;
  END IF;

  -- Receptionist
  INSERT INTO permission_groups (id, name, color, description, is_system)
  VALUES (gen_random_uuid(), 'Receptionist', '#3B82F6', 'Front desk — appointments, customers, payments', true)
  ON CONFLICT (name) DO NOTHING
  RETURNING id INTO v_receptionist_id;

  IF v_receptionist_id IS NOT NULL THEN
    INSERT INTO group_permissions (group_id, permission) VALUES
      (v_receptionist_id, 'overview.view'),
      (v_receptionist_id, 'calendar.view'),
      (v_receptionist_id, 'customers.search'),
      (v_receptionist_id, 'customers.add'),
      (v_receptionist_id, 'appointments.view'),
      (v_receptionist_id, 'appointments.add'),
      (v_receptionist_id, 'payment.view'),
      (v_receptionist_id, 'payment.add'),
      (v_receptionist_id, 'reports.view')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Dentist
  INSERT INTO permission_groups (id, name, color, description, is_system)
  VALUES (gen_random_uuid(), 'Dentist', '#10B981', 'Clinical doctor — treatments, confirmations', true)
  ON CONFLICT (name) DO NOTHING
  RETURNING id INTO v_dentist_id;

  IF v_dentist_id IS NOT NULL THEN
    INSERT INTO group_permissions (group_id, permission) VALUES
      (v_dentist_id, 'overview.view'),
      (v_dentist_id, 'calendar.view'),
      (v_dentist_id, 'appointments.view'),
      (v_dentist_id, 'appointments.edit'),
      (v_dentist_id, 'customers.search'),
      (v_dentist_id, 'customers.view'),
      (v_dentist_id, 'payment.view'),
      (v_dentist_id, 'payment.confirm'),
      (v_dentist_id, 'services.view')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Dental Assistant
  INSERT INTO permission_groups (id, name, color, description, is_system)
  VALUES (gen_random_uuid(), 'Dental Assistant', '#8B5CF6', 'Clinical support — view appointments and customers', true)
  ON CONFLICT (name) DO NOTHING
  RETURNING id INTO v_assistant_id;

  IF v_assistant_id IS NOT NULL THEN
    INSERT INTO group_permissions (group_id, permission) VALUES
      (v_assistant_id, 'overview.view'),
      (v_assistant_id, 'calendar.view'),
      (v_assistant_id, 'appointments.view'),
      (v_assistant_id, 'customers.search'),
      (v_assistant_id, 'services.view')
    ON CONFLICT DO NOTHING;
  END IF;

END $$;

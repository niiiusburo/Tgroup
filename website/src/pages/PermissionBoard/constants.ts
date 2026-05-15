import type { EmployeePermission } from '@/lib/api';

export const MODULES = [
  { name: 'Overview', actions: ['View'] },
  { name: 'Calendar', actions: ['View', 'Edit'] },
  { name: 'Customers', actions: ['View', 'View All', 'Add', 'Edit', 'Delete', 'Hard Delete'] },
  { name: 'Appointments', actions: ['View', 'Add', 'Edit'] },
  { name: 'Services', actions: ['View', 'Add', 'Edit'] },
  { name: 'Payment', actions: ['View', 'Add', 'Edit', 'Confirm', 'Refund', 'Void'] },
  { name: 'Employees', actions: ['View', 'Add', 'Edit'] },
  { name: 'Locations', actions: ['View', 'Add', 'Edit'] },
  { name: 'Reports', actions: ['View', 'Export'] },
  { name: 'Commission', actions: ['View', 'Edit'] },
  { name: 'Settings', actions: ['View', 'Edit'] },
  { name: 'Notifications', actions: ['View', 'Edit'] },
  { name: 'Permissions', actions: ['View', 'Edit'] },
  { name: 'Relationships', actions: ['View'] },
  { name: 'Website', actions: ['View', 'Edit'] },
  { name: 'External Checkups', actions: ['View', 'Create', 'Upload'] },
] as const;

export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'overview.view': 'descriptions.overview.view',
  'calendar.view': 'descriptions.calendar.view',
  'customers.view': 'descriptions.customers.view',
  'customers.view_all': 'descriptions.customers.viewAll',
  'customers.add': 'descriptions.customers.add',
  'customers.edit': 'descriptions.customers.edit',
  'customers.delete': 'descriptions.customers.delete',
  'appointments.view': 'descriptions.appointments.view',
  'appointments.add': 'descriptions.appointments.add',
  'appointments.edit': 'descriptions.appointments.edit',
  'employees.view': 'descriptions.employees.view',
  'employees.edit': 'descriptions.employees.edit',
  'locations.view': 'descriptions.locations.view',
  'locations.edit': 'descriptions.locations.edit',
  'services.view': 'descriptions.services.view',
  'services.edit': 'descriptions.services.edit',
  'payment.view': 'descriptions.payment.view',
  'payment.add': 'descriptions.payment.add',
  'payment.edit': 'descriptions.payment.edit',
  'payment.confirm': 'descriptions.payment.confirm',
  'payment.refund': 'descriptions.payment.refund',
  'payment.void': 'descriptions.payment.void',
  'reports.view': 'descriptions.reports.view',
  'reports.export': 'descriptions.reports.export',
  'settings.view': 'descriptions.settings.view',
  'settings.edit': 'descriptions.settings.edit',
  'notifications.view': 'descriptions.notifications.view',
  'commission.view': 'descriptions.commission.view',
  'permissions.view': 'descriptions.permissions.view',
  'permissions.edit': 'descriptions.permissions.edit',
  'website.view': 'descriptions.website.view',
  'website.edit': 'descriptions.website.edit',
  'external_checkups.view': 'descriptions.externalCheckups.view',
  'external_checkups.create': 'descriptions.externalCheckups.create',
  'external_checkups.upload': 'descriptions.externalCheckups.upload',
  'customers.hard_delete': 'descriptions.customers.hardDelete',
  'appointments.export': 'descriptions.appointments.export',
  'customers.export': 'descriptions.customers.export',
  'payments.export': 'descriptions.payment.export',
  'products.export': 'descriptions.products.export',
  'services.export': 'descriptions.services.export',
};

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

export function getRoleLabel(emp: EmployeePermission): string {
  return emp.groupName || 'Unassigned';
}

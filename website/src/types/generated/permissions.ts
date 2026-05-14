// AUTO-GENERATED from product-map/contracts/permission-registry.yaml
// Do not edit manually. Run: npm run generate:permissions

export type PermissionString =
  | 'appointments.add'
  | 'appointments.edit'
  | 'appointments.export'
  | 'appointments.view'
  | 'calendar.view'
  | 'commission.view'
  | 'customers.add'
  | 'customers.delete'
  | 'customers.edit'
  | 'customers.export'
  | 'customers.hard_delete'
  | 'customers.view'
  | 'customers.view_all'
  | 'employees.edit'
  | 'employees.view'
  | 'external_checkups.create'
  | 'external_checkups.upload'
  | 'external_checkups.view'
  | 'locations.edit'
  | 'locations.view'
  | 'notifications.view'
  | 'overview.view'
  | 'payment.add'
  | 'payment.edit'
  | 'payment.refund'
  | 'payment.view'
  | 'payment.void'
  | 'payments.export'
  | 'permissions.edit'
  | 'permissions.view'
  | 'products.export'
  | 'reports.export'
  | 'reports.view'
  | 'services.edit'
  | 'services.export'
  | 'services.view'
  | 'settings.edit'
  | 'settings.view'
  | 'website.edit'
  | 'website.view';

export const ALL_PERMISSIONS: readonly PermissionString[] = [
  'appointments.add',
  'appointments.edit',
  'appointments.export',
  'appointments.view',
  'calendar.view',
  'commission.view',
  'customers.add',
  'customers.delete',
  'customers.edit',
  'customers.export',
  'customers.hard_delete',
  'customers.view',
  'customers.view_all',
  'employees.edit',
  'employees.view',
  'external_checkups.create',
  'external_checkups.upload',
  'external_checkups.view',
  'locations.edit',
  'locations.view',
  'notifications.view',
  'overview.view',
  'payment.add',
  'payment.edit',
  'payment.refund',
  'payment.view',
  'payment.void',
  'payments.export',
  'permissions.edit',
  'permissions.view',
  'products.export',
  'reports.export',
  'reports.view',
  'services.edit',
  'services.export',
  'services.view',
  'settings.edit',
  'settings.view',
  'website.edit',
  'website.view',
];

export const PERMISSION_CATEGORIES = [
  'appointments',
  'calendar',
  'commission',
  'customers',
  'employees',
  'external_checkups',
  'locations',
  'notifications',
  'overview',
  'payment',
  'payments',
  'permissions',
  'products',
  'reports',
  'services',
  'settings',
  'website',
] as const;

export type PermissionCategory = typeof PERMISSION_CATEGORIES[number];

export type AppointmentsPermission =
  | 'appointments.add'
  | 'appointments.edit'
  | 'appointments.export'
  | 'appointments.view';

export type CalendarPermission =
  | 'calendar.view';

export type CommissionPermission =
  | 'commission.view';

export type CustomersPermission =
  | 'customers.add'
  | 'customers.delete'
  | 'customers.edit'
  | 'customers.export'
  | 'customers.hard_delete'
  | 'customers.view'
  | 'customers.view_all';

export type EmployeesPermission =
  | 'employees.edit'
  | 'employees.view';

export type ExternalCheckupsPermission =
  | 'external_checkups.create'
  | 'external_checkups.upload'
  | 'external_checkups.view';

export type LocationsPermission =
  | 'locations.edit'
  | 'locations.view';

export type NotificationsPermission =
  | 'notifications.view';

export type OverviewPermission =
  | 'overview.view';

export type PaymentPermission =
  | 'payment.add'
  | 'payment.edit'
  | 'payment.refund'
  | 'payment.view'
  | 'payment.void';

export type PaymentsPermission =
  | 'payments.export';

export type PermissionsPermission =
  | 'permissions.edit'
  | 'permissions.view';

export type ProductsPermission =
  | 'products.export';

export type ReportsPermission =
  | 'reports.export'
  | 'reports.view';

export type ServicesPermission =
  | 'services.edit'
  | 'services.export'
  | 'services.view';

export type SettingsPermission =
  | 'settings.edit'
  | 'settings.view';

export type WebsitePermission =
  | 'website.edit'
  | 'website.view';

export const PERMISSION_BY_CATEGORY: Record<PermissionCategory, readonly PermissionString[]> = {
  'appointments': [
    'appointments.add',
    'appointments.edit',
    'appointments.export',
    'appointments.view',
  ],
  'calendar': [
    'calendar.view',
  ],
  'commission': [
    'commission.view',
  ],
  'customers': [
    'customers.add',
    'customers.delete',
    'customers.edit',
    'customers.export',
    'customers.hard_delete',
    'customers.view',
    'customers.view_all',
  ],
  'employees': [
    'employees.edit',
    'employees.view',
  ],
  'external_checkups': [
    'external_checkups.create',
    'external_checkups.upload',
    'external_checkups.view',
  ],
  'locations': [
    'locations.edit',
    'locations.view',
  ],
  'notifications': [
    'notifications.view',
  ],
  'overview': [
    'overview.view',
  ],
  'payment': [
    'payment.add',
    'payment.edit',
    'payment.refund',
    'payment.view',
    'payment.void',
  ],
  'payments': [
    'payments.export',
  ],
  'permissions': [
    'permissions.edit',
    'permissions.view',
  ],
  'products': [
    'products.export',
  ],
  'reports': [
    'reports.export',
    'reports.view',
  ],
  'services': [
    'services.edit',
    'services.export',
    'services.view',
  ],
  'settings': [
    'settings.edit',
    'settings.view',
  ],
  'website': [
    'website.edit',
    'website.view',
  ],
};

/**
 * Mock data for permissions, roles, and entity relationships
 * @crossref:used-in[usePermissions, useRelationshipsData, PermissionMatrix, EntityRelationshipMap]
 */

export interface Permission {
  readonly id: string;
  readonly module: string;
  readonly action: string;
  readonly description: string;
}

export interface Role {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly description: string;
  readonly permissions: readonly string[];
}

export interface EntityNode {
  readonly id: string;
  readonly name: string;
  readonly type: 'core' | 'support' | 'external';
  readonly icon: string;
  readonly color: string;
}

export interface EntityRelation {
  readonly from: string;
  readonly to: string;
  readonly label: string;
  readonly type: 'one-to-many' | 'many-to-many' | 'one-to-one';
}

export const PERMISSIONS: readonly Permission[] = [
  { id: 'overview.view', module: 'Overview', action: 'View', description: 'View dashboard overview' },
  { id: 'calendar.view', module: 'Calendar', action: 'View', description: 'View appointment calendar' },
  { id: 'calendar.edit', module: 'Calendar', action: 'Edit', description: 'Create and modify appointments' },
  { id: 'customers.view', module: 'Customers', action: 'View', description: 'View customer records' },
  { id: 'customers.edit', module: 'Customers', action: 'Edit', description: 'Modify customer records' },
  { id: 'customers.delete', module: 'Customers', action: 'Delete', description: 'Delete customer records' },
  { id: 'appointments.view', module: 'Appointments', action: 'View', description: 'View appointments list' },
  { id: 'appointments.edit', module: 'Appointments', action: 'Edit', description: 'Create and modify appointments' },
  { id: 'services.view', module: 'Services', action: 'View', description: 'View service catalog' },
  { id: 'services.edit', module: 'Services', action: 'Edit', description: 'Modify service offerings' },
  { id: 'payment.view', module: 'Payment', action: 'View', description: 'View payment records' },
  { id: 'payment.edit', module: 'Payment', action: 'Edit', description: 'Process payments' },
  { id: 'payment.refund', module: 'Payment', action: 'Refund', description: 'Process refunds' },
  { id: 'employees.view', module: 'Employees', action: 'View', description: 'View employee list' },
  { id: 'employees.edit', module: 'Employees', action: 'Edit', description: 'Manage employees' },
  { id: 'locations.view', module: 'Locations', action: 'View', description: 'View clinic locations' },
  { id: 'locations.edit', module: 'Locations', action: 'Edit', description: 'Manage locations' },
  { id: 'website.view', module: 'Website', action: 'View', description: 'View website CMS' },
  { id: 'website.edit', module: 'Website', action: 'Edit', description: 'Manage website content' },
  { id: 'reports.view', module: 'Reports', action: 'View', description: 'View reports' },
  { id: 'reports.export', module: 'Reports', action: 'Export', description: 'Export report data' },
  { id: 'commission.view', module: 'Commission', action: 'View', description: 'View commission records' },
  { id: 'commission.edit', module: 'Commission', action: 'Edit', description: 'Manage commission rules' },
  { id: 'settings.view', module: 'Settings', action: 'View', description: 'View settings' },
  { id: 'settings.edit', module: 'Settings', action: 'Edit', description: 'Modify settings' },
  { id: 'notifications.view', module: 'Notifications', action: 'View', description: 'View notifications config' },
  { id: 'notifications.edit', module: 'Notifications', action: 'Edit', description: 'Manage notification rules' },
] as const;

export const ROLES: readonly Role[] = [
  {
    id: 'admin',
    name: 'Admin',
    color: '#EF4444',
    description: 'Full system access',
    permissions: PERMISSIONS.map((p) => p.id),
  },
  {
    id: 'manager',
    name: 'Clinic Manager',
    color: '#8B5CF6',
    description: 'Manage clinic operations',
    permissions: [
      'overview.view', 'calendar.view', 'calendar.edit',
      'customers.view', 'customers.edit',
      'appointments.view', 'appointments.edit',
      'services.view', 'services.edit',
      'payment.view', 'payment.edit',
      'employees.view', 'employees.edit',
      'locations.view',
      'reports.view', 'reports.export',
      'commission.view', 'commission.edit',
      'notifications.view', 'notifications.edit',
    ],
  },
  {
    id: 'dentist',
    name: 'Dentist',
    color: '#0EA5E9',
    description: 'Clinical care provider',
    permissions: [
      'overview.view', 'calendar.view', 'calendar.edit',
      'customers.view',
      'appointments.view', 'appointments.edit',
      'services.view',
      'commission.view',
    ],
  },
  {
    id: 'receptionist',
    name: 'Receptionist',
    color: '#10B981',
    description: 'Front desk operations',
    permissions: [
      'overview.view', 'calendar.view', 'calendar.edit',
      'customers.view', 'customers.edit',
      'appointments.view', 'appointments.edit',
      'payment.view', 'payment.edit',
    ],
  },
  {
    id: 'hygienist',
    name: 'Dental Hygienist',
    color: '#F59E0B',
    description: 'Preventive care specialist',
    permissions: [
      'overview.view', 'calendar.view',
      'customers.view',
      'appointments.view',
      'services.view',
    ],
  },
] as const;

export const ENTITY_NODES: readonly EntityNode[] = [
  { id: 'customers', name: 'Customers', type: 'core', icon: 'Users', color: '#0EA5E9' },
  { id: 'appointments', name: 'Appointments', type: 'core', icon: 'CalendarCheck', color: '#8B5CF6' },
  { id: 'employees', name: 'Employees', type: 'core', icon: 'UserCog', color: '#10B981' },
  { id: 'services', name: 'Services', type: 'core', icon: 'Stethoscope', color: '#F97316' },
  { id: 'payments', name: 'Payments', type: 'support', icon: 'CreditCard', color: '#EF4444' },
  { id: 'locations', name: 'Locations', type: 'support', icon: 'MapPin', color: '#F59E0B' },
  { id: 'commission', name: 'Commission', type: 'support', icon: 'Percent', color: '#EC4899' },
  { id: 'reports', name: 'Reports', type: 'external', icon: 'BarChart3', color: '#6366F1' },
  { id: 'notifications', name: 'Notifications', type: 'external', icon: 'Bell', color: '#14B8A6' },
] as const;

export const ENTITY_RELATIONS: readonly EntityRelation[] = [
  { from: 'customers', to: 'appointments', label: 'books', type: 'one-to-many' },
  { from: 'employees', to: 'appointments', label: 'assigned to', type: 'one-to-many' },
  { from: 'appointments', to: 'services', label: 'includes', type: 'many-to-many' },
  { from: 'appointments', to: 'payments', label: 'generates', type: 'one-to-one' },
  { from: 'employees', to: 'locations', label: 'works at', type: 'many-to-many' },
  { from: 'employees', to: 'commission', label: 'earns', type: 'one-to-many' },
  { from: 'payments', to: 'commission', label: 'triggers', type: 'one-to-many' },
  { from: 'customers', to: 'notifications', label: 'receives', type: 'one-to-many' },
  { from: 'payments', to: 'notifications', label: 'triggers', type: 'one-to-many' },
  { from: 'appointments', to: 'reports', label: 'feeds into', type: 'many-to-many' },
  { from: 'payments', to: 'reports', label: 'feeds into', type: 'many-to-many' },
  { from: 'services', to: 'locations', label: 'available at', type: 'many-to-many' },
] as const;

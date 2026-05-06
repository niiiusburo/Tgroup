/**
 * Permission types re-exported from /types/ and constants/
 * @crossref:used-in[usePermissionGroups, PermissionGroupConfig, EmployeeProfile]
 */

import type { Permission, Role } from '@/types/permissions';
import { ENTITY_NODES, ENTITY_RELATIONS } from '@/constants/entityGraph';
import type { LocationBranch } from '@/types/location';

export type { Permission, Role };

export { ENTITY_NODES, ENTITY_RELATIONS };

// Permission groups (no mock data - use API)
export interface PermissionGroup {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly description: string;
  readonly permissions: readonly string[];
  readonly isSystem?: boolean;
}

export interface EmployeePermissionAssignment {
  readonly employeeId: string;
  readonly employeeName: string;
  readonly groupId: string;
  readonly groupName: string;
  readonly locations: readonly { id: string; name: string }[];
  readonly locScope: string;
  readonly overrides: { grant: string[]; revoke: string[] };
}

export type LocationScope = 'all' | 'assigned' | 'specific';

export const PERMISSIONS: readonly Permission[] = [
  { id: 'overview.view', module: 'Overview', action: 'View', description: 'View dashboard' },
  { id: 'calendar.view', module: 'Calendar', action: 'View', description: 'View calendar' },
  { id: 'calendar.edit', module: 'Calendar', action: 'Edit', description: 'Edit calendar' },
  { id: 'customers.view', module: 'Customers', action: 'View', description: 'View customers' },
  { id: 'customers.view_all', module: 'Customers', action: 'View All', description: 'View all customers without search' },
  { id: 'customers.search', module: 'Customers', action: 'Search', description: 'Search customers only' },
  { id: 'customers.add', module: 'Customers', action: 'Add', description: 'Add customers' },
  { id: 'customers.edit', module: 'Customers', action: 'Edit', description: 'Edit customers' },
  { id: 'customers.delete', module: 'Customers', action: 'Delete', description: 'Soft delete customers' },
  { id: 'customers.hard_delete', module: 'Customers', action: 'Hard Delete', description: 'Permanently delete customers' },
  { id: 'appointments.view', module: 'Appointments', action: 'View', description: 'View appointments' },
  { id: 'appointments.add', module: 'Appointments', action: 'Add', description: 'Add appointments' },
  { id: 'appointments.edit', module: 'Appointments', action: 'Edit', description: 'Edit appointments' },
  { id: 'services.view', module: 'Services', action: 'View', description: 'View services' },
  { id: 'services.add', module: 'Services', action: 'Add', description: 'Add services' },
  { id: 'services.edit', module: 'Services', action: 'Edit', description: 'Edit services' },
  { id: 'payment.view', module: 'Payment', action: 'View', description: 'View payments' },
  { id: 'payment.add', module: 'Payment', action: 'Add', description: 'Add payments' },
  { id: 'payment.refund', module: 'Payment', action: 'Refund', description: 'Refund payments' },
  { id: 'payment.confirm', module: 'Payment', action: 'Confirm', description: 'Confirm payment receipt' },
  { id: 'payment.void', module: 'Payment', action: 'Void', description: 'Void or delete payments' },
  { id: 'employees.view', module: 'Employees', action: 'View', description: 'View employees' },
  { id: 'employees.add', module: 'Employees', action: 'Add', description: 'Add employees' },
  { id: 'employees.edit', module: 'Employees', action: 'Edit', description: 'Edit employees' },
  { id: 'locations.view', module: 'Locations', action: 'View', description: 'View locations' },
  { id: 'locations.add', module: 'Locations', action: 'Add', description: 'Add locations' },
  { id: 'locations.edit', module: 'Locations', action: 'Edit', description: 'Edit locations' },
  { id: 'reports.view', module: 'Reports', action: 'View', description: 'View reports' },
  { id: 'reports.export', module: 'Reports', action: 'Export', description: 'Export reports' },
  { id: 'commission.view', module: 'Commission', action: 'View', description: 'View commissions' },
  { id: 'commission.edit', module: 'Commission', action: 'Edit', description: 'Edit commissions' },
  { id: 'settings.view', module: 'Settings', action: 'View', description: 'View settings' },
  { id: 'settings.edit', module: 'Settings', action: 'Edit', description: 'Edit settings' },
  { id: 'notifications.view', module: 'Notifications', action: 'View', description: 'View notifications' },
  { id: 'notifications.edit', module: 'Notifications', action: 'Edit', description: 'Edit notifications' },
  { id: 'permissions.view', module: 'Permissions', action: 'View', description: 'View permissions' },
  { id: 'permissions.edit', module: 'Permissions', action: 'Edit', description: 'Edit permissions' },
  { id: 'relationships.view', module: 'Relationships', action: 'View', description: 'View relationships' },
  { id: 'website.view', module: 'Website', action: 'View', description: 'View website pages' },
  { id: 'website.edit', module: 'Website', action: 'Edit', description: 'Edit website pages' },
  { id: 'external_checkups.view', module: 'Health Checkups', action: 'View', description: 'View external health checkup images' },
  { id: 'external_checkups.create', module: 'Health Checkups', action: 'Create', description: 'Upload external health checkup images' },
];

export const ROLES: readonly Role[] = [
  { id: 'admin', name: 'Admin', color: '#EF4444', description: 'Full access', permissions: PERMISSIONS.map((p) => p.id) },
  { id: 'manager', name: 'Manager', color: '#8B5CF6', description: 'Manager', permissions: ['overview.view', 'calendar.view', 'customers.view'] },
];

export const MOCK_PERMISSION_GROUPS: PermissionGroup[] = [];
export const MOCK_ASSIGNMENTS: EmployeePermissionAssignment[] = [];
export const MOCK_LOCATION_BRANCHES: LocationBranch[] = [];

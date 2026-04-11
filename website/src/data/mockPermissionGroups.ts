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
  { id: 'customers.edit', module: 'Customers', action: 'Edit', description: 'Edit customers' },
  { id: 'appointments.view', module: 'Appointments', action: 'View', description: 'View appointments' },
  { id: 'appointments.edit', module: 'Appointments', action: 'Edit', description: 'Edit appointments' },
  { id: 'services.view', module: 'Services', action: 'View', description: 'View services' },
  { id: 'services.edit', module: 'Services', action: 'Edit', description: 'Edit services' },
  { id: 'payment.view', module: 'Payment', action: 'View', description: 'View payments' },
  { id: 'payment.edit', module: 'Payment', action: 'Edit', description: 'Edit payments' },
  { id: 'external_checkups.view', module: 'Health Checkups', action: 'View', description: 'View external health checkup images' },
];

export const ROLES: readonly Role[] = [
  { id: 'admin', name: 'Admin', color: '#EF4444', description: 'Full access', permissions: PERMISSIONS.map((p) => p.id) },
  { id: 'manager', name: 'Manager', color: '#8B5CF6', description: 'Manager', permissions: ['overview.view', 'calendar.view', 'customers.view'] },
];

export const MOCK_PERMISSION_GROUPS: PermissionGroup[] = [];
export const MOCK_ASSIGNMENTS: EmployeePermissionAssignment[] = [];
export const MOCK_LOCATION_BRANCHES: LocationBranch[] = [];

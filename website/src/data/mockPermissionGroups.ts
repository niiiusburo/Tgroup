/**
 * Permission Groups — role-based permission templates with location scoping
 *
 * Architecture:
 *   PermissionGroup = defines WHAT a group can do (module.action permissions)
 *   EmployeePermissionAssignment = links an employee to a group + defines WHERE (location scope)
 *
 * Flow:
 *   1. Admin creates Permission Groups (e.g., "Dentist", "Receptionist", "Manager")
 *   2. Each group has a set of permissions (e.g., calendar.view, customers.edit)
 *   3. When assigning an employee, admin picks a group + selects locations (checkboxes)
 *   4. Employee can optionally have individual permission overrides on top of the group
 *
 * @crossref:used-in[usePermissionGroups, PermissionGroupConfig, EmployeeProfile]
 */

// ─── Permission Definitions ──────────────────────────────────────

export interface Permission {
  readonly id: string;
  readonly module: string;
  readonly action: string;
  readonly description: string;
}

/** All available permissions in the system, grouped by module */
export const PERMISSIONS: readonly Permission[] = [
  // Overview
  { id: 'overview.view', module: 'Overview', action: 'View', description: 'View dashboard overview' },

  // Calendar
  { id: 'calendar.view', module: 'Calendar', action: 'View', description: 'View appointment calendar' },
  { id: 'calendar.edit', module: 'Calendar', action: 'Edit', description: 'Create and modify appointments' },

  // Customers
  { id: 'customers.view', module: 'Customers', action: 'View', description: 'View customer records' },
  { id: 'customers.edit', module: 'Customers', action: 'Edit', description: 'Modify customer records' },
  { id: 'customers.delete', module: 'Customers', action: 'Delete', description: 'Delete customer records' },

  // Appointments
  { id: 'appointments.view', module: 'Appointments', action: 'View', description: 'View appointments list' },
  { id: 'appointments.edit', module: 'Appointments', action: 'Edit', description: 'Create and modify appointments' },

  // Services
  { id: 'services.view', module: 'Services', action: 'View', description: 'View service catalog' },
  { id: 'services.edit', module: 'Services', action: 'Edit', description: 'Modify service offerings' },

  // Payment
  { id: 'payment.view', module: 'Payment', action: 'View', description: 'View payment records' },
  { id: 'payment.edit', module: 'Payment', action: 'Edit', description: 'Process payments' },
  { id: 'payment.refund', module: 'Payment', action: 'Refund', description: 'Process refunds' },

  // Employees
  { id: 'employees.view', module: 'Employees', action: 'View', description: 'View employee list' },
  { id: 'employees.edit', module: 'Employees', action: 'Edit', description: 'Manage employees' },

  // Locations
  { id: 'locations.view', module: 'Locations', action: 'View', description: 'View clinic locations' },
  { id: 'locations.edit', module: 'Locations', action: 'Edit', description: 'Manage locations' },

  // Reports
  { id: 'reports.view', module: 'Reports', action: 'View', description: 'View reports' },
  { id: 'reports.export', module: 'Reports', action: 'Export', description: 'Export report data' },

  // Commission
  { id: 'commission.view', module: 'Commission', action: 'View', description: 'View commission records' },
  { id: 'commission.edit', module: 'Commission', action: 'Edit', description: 'Manage commission rules' },

  // Settings
  { id: 'settings.view', module: 'Settings', action: 'View', description: 'View settings' },
  { id: 'settings.edit', module: 'Settings', action: 'Edit', description: 'Modify settings' },

  // Notifications
  { id: 'notifications.view', module: 'Notifications', action: 'View', description: 'View notifications config' },
  { id: 'notifications.edit', module: 'Notifications', action: 'Edit', description: 'Manage notification rules' },
] as const;

// ─── Permission Group ──────────────────────────────────────────

export interface PermissionGroup {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly description: string;
  readonly permissions: readonly string[];  // permission IDs from PERMISSIONS
  readonly isSystem: boolean;               // system groups can't be deleted
}

export const MOCK_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'group-admin',
    name: 'Admin',
    color: '#EF4444',
    description: 'Full system access across all modules',
    permissions: PERMISSIONS.map((p) => p.id),
    isSystem: true,
  },
  {
    id: 'group-manager',
    name: 'Clinic Manager',
    color: '#8B5CF6',
    description: 'Manage clinic operations, staff, and finances',
    permissions: [
      'overview.view', 'calendar.view', 'calendar.edit',
      'customers.view', 'customers.edit',
      'appointments.view', 'appointments.edit',
      'services.view', 'services.edit',
      'payment.view', 'payment.edit',
      'employees.view', 'employees.edit',
      'locations.view', 'locations.edit',
      'reports.view', 'reports.export',
      'commission.view', 'commission.edit',
      'notifications.view', 'notifications.edit',
    ],
    isSystem: false,
  },
  {
    id: 'group-dentist',
    name: 'Dentist',
    color: '#0EA5E9',
    description: 'Clinical care — view patients, manage appointments',
    permissions: [
      'overview.view', 'calendar.view', 'calendar.edit',
      'customers.view',
      'appointments.view', 'appointments.edit',
      'services.view',
      'commission.view',
    ],
    isSystem: false,
  },
  {
    id: 'group-receptionist',
    name: 'Receptionist',
    color: '#10B981',
    description: 'Front desk — schedule, check-in, payments',
    permissions: [
      'overview.view', 'calendar.view', 'calendar.edit',
      'customers.view', 'customers.edit',
      'appointments.view', 'appointments.edit',
      'payment.view', 'payment.edit',
    ],
    isSystem: false,
  },
  {
    id: 'group-assistant',
    name: 'Dental Assistant',
    color: '#F59E0B',
    description: 'Support dentists — view schedule and patient info',
    permissions: [
      'overview.view', 'calendar.view',
      'customers.view',
      'appointments.view',
      'services.view',
    ],
    isSystem: false,
  },
];

// ─── Employee ↔ Group Assignment (with location scope) ────────

export type LocationScope =
  | { type: 'all' }                           // access to ALL locations
  | { type: 'specific'; locationIds: string[] }; // only selected locations

export interface EmployeePermissionAssignment {
  readonly employeeId: string;
  readonly groupId: string;            // which permission group
  readonly locationScope: LocationScope; // which locations this applies to
  readonly overrides: {
    readonly grant: readonly string[];  // extra permissions on top of group
    readonly revoke: readonly string[]; // permissions removed from group
  };
}

/** Mock assignments linking employees to groups + locations */
export const MOCK_ASSIGNMENTS: EmployeePermissionAssignment[] = [
  {
    employeeId: 'emp-8', // Dr. Nguyen Thanh Son — Director
    groupId: 'group-admin',
    locationScope: { type: 'all' },
    overrides: { grant: [], revoke: [] },
  },
  {
    employeeId: 'emp-1', // Dr. Tran Minh Duc — Senior Dentist
    groupId: 'group-dentist',
    locationScope: { type: 'specific', locationIds: ['loc-1', 'loc-3'] },
    overrides: { grant: ['reports.view'], revoke: [] },  // extra: can view reports
  },
  {
    employeeId: 'emp-2', // Dr. Le Thi Hoa — Lead Orthodontist
    groupId: 'group-dentist',
    locationScope: { type: 'specific', locationIds: ['loc-2'] },
    overrides: { grant: ['employees.view'], revoke: [] },
  },
  {
    employeeId: 'emp-6', // Vo Thi Lan — Senior Manager
    groupId: 'group-manager',
    locationScope: { type: 'specific', locationIds: ['loc-3', 'loc-6'] },
    overrides: { grant: [], revoke: [] },
  },
  {
    employeeId: 'emp-3', // Nguyen Van Binh — Hygienist
    groupId: 'group-assistant',
    locationScope: { type: 'specific', locationIds: ['loc-1'] },
    overrides: { grant: [], revoke: [] },
  },
  {
    employeeId: 'emp-4', // Pham Thi Mai — Assistant
    groupId: 'group-assistant',
    locationScope: { type: 'specific', locationIds: ['loc-2'] },
    overrides: { grant: [], revoke: [] },
  },
  {
    employeeId: 'emp-5', // Hoang Anh Tuan — Assistant/Receptionist
    groupId: 'group-receptionist',
    locationScope: { type: 'specific', locationIds: ['loc-1'] },
    overrides: { grant: [], revoke: [] },
  },
  {
    employeeId: 'emp-7', // Dao Quoc Hung — Lab Tech
    groupId: 'group-assistant',
    locationScope: { type: 'specific', locationIds: ['loc-1'] },
    overrides: { grant: [], revoke: [] },
  },
];

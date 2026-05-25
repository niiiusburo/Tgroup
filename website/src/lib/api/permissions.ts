import { apiFetch } from './core';

// ─── Permissions ──────────────────────────────────────────────────

type BusinessUnit = 'dental' | 'cosmetic';

export interface PermissionGroup {
  id: string;
  name: string;
  color: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
}

export interface EmployeePermission {
  employeeId: string;
  employeeName: string;
  employeeEmail?: string | null;
  groupId: string;
  groupName: string;
  groupColor: string;
  locScope: string;
  locations: { id: string; name: string }[];
  overrides: { grant: string[]; revoke: string[] };
}

export interface ResolvedPermission {
  employeeId: string;
  employeeName: string;
  group: { id: string; name: string; basePermissions: string[] };
  overrides: { grant: string[]; revoke: string[] };
  effectivePermissions: string[];
  locations: { id: string; name: string }[];
}

export function fetchPermissionGroups(lob?: BusinessUnit) {
  return apiFetch<PermissionGroup[]>('/Permissions/groups', { lob });
}

export function fetchEmployeePermissions(lob?: BusinessUnit) {
  return apiFetch<EmployeePermission[]>('/Permissions/employees', { lob });
}

export function updateEmployeePermission(employeeId: string, data: {
  groupId: string;
  locScope: string;
  locationIds: string[];
  overrides: { grant: string[]; revoke: string[] };
}, lob?: BusinessUnit) {
  return apiFetch<EmployeePermission>(`/Permissions/employees/${employeeId}`, { method: 'PUT', body: data, lob });
}

export function resolveEmployeePermissions(employeeId: string, lob?: BusinessUnit) {
  return apiFetch<ResolvedPermission>(`/Permissions/resolve/${employeeId}`, { lob });
}

export function createPermissionGroup(data: { name: string; color: string; description: string; permissions: string[] }, lob?: BusinessUnit) {
  return apiFetch<PermissionGroup>('/Permissions/groups', { method: 'POST', body: data, lob });
}

export function updatePermissionGroup(groupId: string, data: { name: string; color: string; description: string; permissions: string[] }, lob?: BusinessUnit) {
  return apiFetch<PermissionGroup>(`/Permissions/groups/${groupId}`, { method: 'PUT', body: data, lob });
}

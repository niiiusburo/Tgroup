import { apiFetch } from './core';

// ─── Permissions ──────────────────────────────────────────────────

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

export function fetchPermissionGroups() {
  return apiFetch<PermissionGroup[]>('/Permissions/groups');
}

export function fetchEmployeePermissions() {
  return apiFetch<EmployeePermission[]>('/Permissions/employees');
}

export function updateEmployeePermission(employeeId: string, data: {
  groupId: string;
  locScope: string;
  locationIds: string[];
  overrides: { grant: string[]; revoke: string[] };
}) {
  return apiFetch<EmployeePermission>(`/Permissions/employees/${employeeId}`, { method: 'PUT', body: data });
}

export function resolveEmployeePermissions(employeeId: string) {
  return apiFetch<ResolvedPermission>(`/Permissions/resolve/${employeeId}`);
}

export function createPermissionGroup(data: { name: string; color: string; description: string; permissions: string[] }) {
  return apiFetch<PermissionGroup>('/Permissions/groups', { method: 'POST', body: data });
}

export function updatePermissionGroup(groupId: string, data: { name?: string; color?: string; description?: string; permissions?: string[] }) {
  return apiFetch<PermissionGroup>(`/Permissions/groups/${groupId}`, { method: 'PUT', body: data });
}

export function deletePermissionGroup(groupId: string) {
  return apiFetch<void>(`/Permissions/groups/${groupId}`, { method: 'DELETE' });
}

export function unassignEmployeePermission(employeeId: string) {
  return apiFetch<EmployeePermission>(`/Permissions/employees/${employeeId}`, {
    method: 'PUT',
    body: { groupId: null, locScope: 'assigned', locationIds: [], overrides: { grant: [], revoke: [] } },
  });
}

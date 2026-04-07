/**
 * usePermissionBoard - Permission management hook for the Permission Board page
 * @crossref:used-in[PermissionBoard]
 * @crossref:uses[fetchPermissionGroups, fetchEmployeePermissions, fetchCompanies]
 */
import { useState, useEffect, useCallback } from 'react';
import {
  fetchPermissionGroups,
  fetchEmployeePermissions,
  updateEmployeePermission,
  updatePermissionGroup,
  fetchCompanies,
  type PermissionGroup,
  type EmployeePermission,
  type ApiCompany,
} from '@/lib/api';

export function usePermissionBoard() {
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [employees, setEmployees] = useState<EmployeePermission[]>([]);
  const [locations, setLocations] = useState<ApiCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [groupsRes, employeesRes, locationsRes] = await Promise.all([
        fetchPermissionGroups(),
        fetchEmployeePermissions(),
        fetchCompanies({ offset: 0, limit: 50 }),
      ]);
      setGroups(groupsRes);
      setEmployees(employeesRes);
      setLocations(locationsRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const updateEmployee = useCallback(async (
    employeeId: string,
    data: { groupId: string; locScope: string; locationIds: string[]; overrides: { grant: string[]; revoke: string[] } }
  ) => {
    const updated = await updateEmployeePermission(employeeId, data);
    setEmployees(prev => prev.map(e => e.employeeId === employeeId ? updated : e));
    return updated;
  }, []);

  const getEffective = useCallback((emp: EmployeePermission): string[] => {
    const group = groups.find(g => g.id === emp.groupId);
    if (!group) return [];
    const s = new Set(group.permissions);
    emp.overrides.grant.forEach(p => s.add(p));
    emp.overrides.revoke.forEach(p => s.delete(p));
    return [...s];
  }, [groups]);

  const toggleGroupPermission = useCallback(async (groupId: string, permission: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group || group.isSystem) return;
    const has = group.permissions.includes(permission);
    const newPerms = has
      ? group.permissions.filter(p => p !== permission)
      : [...group.permissions, permission];
    const updated = await updatePermissionGroup(groupId, {
      name: group.name,
      color: group.color,
      description: group.description || '',
      permissions: newPerms,
    });
    setGroups(prev => prev.map(g => g.id === groupId ? updated : g));
    return updated;
  }, [groups]);

  return { groups, employees, locations, loading, error, updateEmployee, toggleGroupPermission, getEffective, refetch: loadAll };
}

/**
 * Hook for managing Permission Groups, assignments, and location scoping
 *
 * Provides:
 *   - CRUD for permission groups (create, edit permissions, delete non-system)
 *   - Assign employees to groups with location scope (all / specific checkboxes)
 *   - Individual permission overrides per employee
 *   - Computed effective permissions for any employee
 *
 * @crossref:used-in[PermissionGroupConfig, EmployeeProfile, Settings]
 * @crossref:uses[mockPermissionGroups, mockLocations]
 */

import { useState, useMemo, useCallback } from 'react';
import {
  PERMISSIONS,
  MOCK_PERMISSION_GROUPS,
  MOCK_ASSIGNMENTS,
  type Permission,
  type PermissionGroup,
  type EmployeePermissionAssignment,
  type LocationScope,
} from '@/data/mockPermissionGroups';
import { MOCK_LOCATION_BRANCHES, type LocationBranch } from '@/data/mockLocations';

export function usePermissionGroups() {
  const [groups, setGroups] = useState<PermissionGroup[]>([...MOCK_PERMISSION_GROUPS]);
  const [assignments, setAssignments] = useState<EmployeePermissionAssignment[]>([...MOCK_ASSIGNMENTS]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const locations: readonly LocationBranch[] = MOCK_LOCATION_BRANCHES;
  const permissions: readonly Permission[] = PERMISSIONS;

  // ─── Derived state ────────────────────────────────────────

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  const permissionsByModule = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    for (const p of permissions) {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    }
    return grouped;
  }, [permissions]);

  /** How many employees are in each group */
  const groupMemberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of groups) counts[g.id] = 0;
    for (const a of assignments) {
      counts[a.groupId] = (counts[a.groupId] ?? 0) + 1;
    }
    return counts;
  }, [groups, assignments]);

  /** Get assignment for a specific employee */
  const getAssignment = useCallback(
    (employeeId: string): EmployeePermissionAssignment | null => {
      return assignments.find((a) => a.employeeId === employeeId) ?? null;
    },
    [assignments],
  );

  /** Get all assignments for a specific group */
  const getGroupAssignments = useCallback(
    (groupId: string): EmployeePermissionAssignment[] => {
      return assignments.filter((a) => a.groupId === groupId);
    },
    [assignments],
  );

  /** Compute effective permissions for an employee (group + overrides) */
  const getEffectivePermissions = useCallback(
    (employeeId: string): string[] => {
      const assignment = assignments.find((a) => a.employeeId === employeeId);
      if (!assignment) return [];

      const group = groups.find((g) => g.id === assignment.groupId);
      if (!group) return [];

      const base = new Set(group.permissions);
      for (const p of assignment.overrides.grant) base.add(p);
      for (const p of assignment.overrides.revoke) base.delete(p);
      return [...base];
    },
    [assignments, groups],
  );

  /** Check if employee has access to a specific location */
  const hasLocationAccess = useCallback(
    (employeeId: string, locationId: string): boolean => {
      const assignment = assignments.find((a) => a.employeeId === employeeId);
      if (!assignment) return false;
      if (assignment.locationScope.type === 'all') return true;
      return assignment.locationScope.locationIds.includes(locationId);
    },
    [assignments],
  );

  // ─── Group mutations ──────────────────────────────────────

  const toggleGroupPermission = useCallback((groupId: string, permissionId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const has = g.permissions.includes(permissionId);
        return {
          ...g,
          permissions: has
            ? g.permissions.filter((p) => p !== permissionId)
            : [...g.permissions, permissionId],
        };
      }),
    );
  }, []);

  const addGroup = useCallback((name: string, color: string, description: string) => {
    const newGroup: PermissionGroup = {
      id: `group-${Date.now()}`,
      name,
      color,
      description,
      permissions: ['overview.view'],  // minimum default
      isSystem: false,
    };
    setGroups((prev) => [...prev, newGroup]);
    return newGroup;
  }, []);

  const removeGroup = useCallback((groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId || g.isSystem));
    // Also remove assignments for this group
    setAssignments((prev) => prev.filter((a) => a.groupId !== groupId));
  }, []);

  const updateGroup = useCallback((groupId: string, updates: Partial<Pick<PermissionGroup, 'name' | 'color' | 'description'>>) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ...updates } : g)),
    );
  }, []);

  // ─── Assignment mutations ─────────────────────────────────

  const assignEmployee = useCallback(
    (employeeId: string, groupId: string, locationScope: LocationScope) => {
      setAssignments((prev) => {
        const existing = prev.findIndex((a) => a.employeeId === employeeId);
        const newAssignment: EmployeePermissionAssignment = {
          employeeId,
          groupId,
          locationScope,
          overrides: existing >= 0 ? prev[existing].overrides : { grant: [], revoke: [] },
        };
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = newAssignment;
          return updated;
        }
        return [...prev, newAssignment];
      });
    },
    [],
  );

  const updateLocationScope = useCallback(
    (employeeId: string, locationScope: LocationScope) => {
      setAssignments((prev) =>
        prev.map((a) => (a.employeeId === employeeId ? { ...a, locationScope } : a)),
      );
    },
    [],
  );

  const toggleLocationForEmployee = useCallback(
    (employeeId: string, locationId: string) => {
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.employeeId !== employeeId) return a;
          if (a.locationScope.type === 'all') {
            // Switching from "all" to specific: include all except the toggled one
            const allIds = MOCK_LOCATION_BRANCHES.map((l) => l.id).filter((id) => id !== locationId);
            return { ...a, locationScope: { type: 'specific', locationIds: allIds } };
          }
          const has = a.locationScope.locationIds.includes(locationId);
          const newIds = has
            ? a.locationScope.locationIds.filter((id) => id !== locationId)
            : [...a.locationScope.locationIds, locationId];
          // If all locations are selected, switch to "all"
          if (newIds.length === MOCK_LOCATION_BRANCHES.length) {
            return { ...a, locationScope: { type: 'all' } };
          }
          return { ...a, locationScope: { type: 'specific', locationIds: newIds } };
        }),
      );
    },
    [],
  );

  const setAllLocations = useCallback(
    (employeeId: string, allLocations: boolean) => {
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.employeeId !== employeeId) return a;
          return {
            ...a,
            locationScope: allLocations
              ? { type: 'all' }
              : { type: 'specific', locationIds: [] },
          };
        }),
      );
    },
    [],
  );

  const removeAssignment = useCallback((employeeId: string) => {
    setAssignments((prev) => prev.filter((a) => a.employeeId !== employeeId));
  }, []);

  // ─── Override mutations ───────────────────────────────────

  const toggleOverrideGrant = useCallback(
    (employeeId: string, permissionId: string) => {
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.employeeId !== employeeId) return a;
          const hasGrant = a.overrides.grant.includes(permissionId);
          return {
            ...a,
            overrides: {
              ...a.overrides,
              grant: hasGrant
                ? a.overrides.grant.filter((p) => p !== permissionId)
                : [...a.overrides.grant, permissionId],
              // Remove from revoke if granting
              revoke: a.overrides.revoke.filter((p) => p !== permissionId),
            },
          };
        }),
      );
    },
    [],
  );

  const toggleOverrideRevoke = useCallback(
    (employeeId: string, permissionId: string) => {
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.employeeId !== employeeId) return a;
          const hasRevoke = a.overrides.revoke.includes(permissionId);
          return {
            ...a,
            overrides: {
              ...a.overrides,
              revoke: hasRevoke
                ? a.overrides.revoke.filter((p) => p !== permissionId)
                : [...a.overrides.revoke, permissionId],
              // Remove from grant if revoking
              grant: a.overrides.grant.filter((p) => p !== permissionId),
            },
          };
        }),
      );
    },
    [],
  );

  return {
    // Data
    groups,
    assignments,
    locations,
    permissions,
    permissionsByModule,
    groupMemberCounts,
    selectedGroup,
    selectedGroupId,
    setSelectedGroupId,
    selectedEmployeeId,
    setSelectedEmployeeId,

    // Queries
    getAssignment,
    getGroupAssignments,
    getEffectivePermissions,
    hasLocationAccess,

    // Group mutations
    toggleGroupPermission,
    addGroup,
    removeGroup,
    updateGroup,

    // Assignment mutations
    assignEmployee,
    updateLocationScope,
    toggleLocationForEmployee,
    setAllLocations,
    removeAssignment,

    // Override mutations
    toggleOverrideGrant,
    toggleOverrideRevoke,
  } as const;
}

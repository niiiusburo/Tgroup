/**
 * Hook for managing Permission Groups, assignments, and location scoping
 * NOW CONNECTED TO REAL API
 *
 * @crossref:used-in[PermissionGroupConfig, EmployeeProfile, Settings]
 * @crossref:uses[api]
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  fetchPermissionGroups,
  fetchEmployeePermissions,
  fetchCompanies,
  updateEmployeePermission,
  type PermissionGroup,
  type EmployeePermission,
} from '@/lib/api';
import { PERMISSIONS } from '@/data/mockPermissionGroups';
import type { Permission } from '@/data/mockPermissionGroups';

// Export types
export type { Permission, PermissionGroup };
export type { EmployeePermission };

export type LocationScope = 'all' | 'assigned' | 'specific';

// Location branch type
export interface LocationBranch {
  readonly id: string;
  readonly name: string;
}

// Employee permission assignment with locations
export interface EmployeePermissionAssignment {
  readonly employeeId: string;
  readonly employeeName: string;
  readonly employeeEmail?: string | null;
  readonly groupId: string;
  readonly groupName: string;
  readonly groupColor?: string;
  readonly locations: readonly { id: string; name: string }[];
  readonly locScope: string;
  readonly overrides: { grant: readonly string[]; revoke: readonly string[] };
}

export function usePermissionGroups() {
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [assignments, setAssignments] = useState<EmployeePermissionAssignment[]>([]);
  const [locations, setLocations] = useState<readonly LocationBranch[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const permissions: readonly Permission[] = PERMISSIONS;

  // Fetch data from API on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const [fetchedGroups, fetchedAssignments, fetchedCompanies] = await Promise.all([
          fetchPermissionGroups(),
          fetchEmployeePermissions(),
          fetchCompanies({ limit: 100 }),
        ]);

        // Map API response to our types
        const mappedGroups: PermissionGroup[] = fetchedGroups.map((g) => ({
          id: g.id,
          name: g.name,
          color: g.color,
          description: g.description ?? '',
          permissions: g.permissions,
          isSystem: g.isSystem,
        }));

        const mappedAssignments: EmployeePermissionAssignment[] = fetchedAssignments.map((a) => ({
          employeeId: a.employeeId,
          employeeName: a.employeeName,
          employeeEmail: a.employeeEmail,
          groupId: a.groupId,
          groupName: a.groupName,
          groupColor: a.groupColor,
          locations: a.locations,
          locScope: a.locScope,
          overrides: a.overrides,
        }));

        setGroups(mappedGroups);
        setAssignments(mappedAssignments);
        setLocations(fetchedCompanies.items.map((c) => ({ id: c.id, name: c.name })));
      } catch (err) {
        console.error('usePermissionGroups: failed to load data', err);
        setError(err instanceof Error ? err.message : 'Failed to load permission groups');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

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
      if (assignment.locScope === 'all') return true;
      return assignment.locations.some((loc) => loc.id === locationId);
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
            ? g.permissions.filter((p: string) => p !== permissionId)
            : [...g.permissions, permissionId],
        };
      }),
    );
  }, []);

  const addGroup = useCallback(async (name: string, color: string, description: string) => {
    const newGroup: PermissionGroup = {
      id: `group-${Date.now()}`,
      name,
      color,
      description,
      permissions: ['overview.view'],
      isSystem: false,
    };

    // TODO: Call API to create group
    setGroups((prev) => [...prev, newGroup]);
    return newGroup;
  }, []);

  const removeGroup = useCallback((groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId || g.isSystem));
    setAssignments((prev) => prev.filter((a) => a.groupId !== groupId));
  }, []);

  const updateGroup = useCallback((groupId: string, updates: Partial<Pick<PermissionGroup, 'name' | 'color' | 'description'>>) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ...updates } : g)),
    );
  }, []);

  // ─── Assignment mutations ─────────────────────────────────

  const assignEmployee = useCallback(
    async (employeeId: string, groupId: string, locationScope: LocationScope) => {
      const newAssignment: EmployeePermissionAssignment = {
        employeeId,
        groupId,
        employeeName: '', // Will be filled from API
        employeeEmail: null,
        groupName: groups.find((g) => g.id === groupId)?.name ?? '',
        locations: [],
        locScope: locationScope,
        overrides: { grant: [], revoke: [] },
      };

      try {
        await updateEmployeePermission(employeeId, {
          groupId,
          locScope: locationScope,
          locationIds: [],
          overrides: { grant: [], revoke: [] },
        });

        setAssignments((prev) => {
          const existing = prev.findIndex((a) => a.employeeId === employeeId);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newAssignment;
            return updated;
          }
          return [...prev, newAssignment];
        });
      } catch (err) {
        console.error('usePermissionGroups: failed to assign employee', err);
        throw err;
      }
    },
    [groups],
  );

  const removeAssignment = useCallback((employeeId: string) => {
    setAssignments((prev) => prev.filter((a) => a.employeeId !== employeeId));
  }, []);

  // ─── Location scope mutations ─────────────────────────────────

  const toggleLocationForEmployee = useCallback(
    (employeeId: string, locationId: string) => {
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.employeeId !== employeeId) return a;

          const currentScope = a.locScope;
          const currentLocations = a.locations;
          const isCurrentlyAll = currentScope === 'all';
          const locationIds = currentLocations.map((l) => l.id);
          const hasLocation = locationIds.includes(locationId);

          if (isCurrentlyAll) {
            // Switching from "all" to specific: exclude the toggled location
            const newLocations = locations
              .filter((loc) => loc.id !== locationId)
              .map((loc) => ({ id: loc.id, name: loc.name }));
            return {
              ...a,
              locScope: 'specific' as LocationScope,
              locations: newLocations,
            };
          }

          // Toggle individual location
          const newLocations = hasLocation
            ? currentLocations.filter((l) => l.id !== locationId)
            : [...currentLocations, locations.find((l) => l.id === locationId)!];

          // If all locations selected, switch to 'all'
          if (newLocations.length === locations.length) {
            return {
              ...a,
              locScope: 'all' as LocationScope,
              locations: locations.map((l) => ({ id: l.id, name: l.name })),
            };
          }

          return {
            ...a,
            locScope: 'specific' as LocationScope,
            locations: newLocations,
          };
        }),
      );
    },
    [locations],
  );

  const setAllLocations = useCallback(
    (employeeId: string, allLocations: boolean) => {
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.employeeId !== employeeId) return a;
          return {
            ...a,
            locScope: allLocations ? 'all' as LocationScope : 'specific' as LocationScope,
            locations: allLocations ? locations.map((l) => ({ id: l.id, name: l.name })) : [],
          };
        }),
      );
    },
    [locations],
  );

  // ─── Override mutations ─────────────────────────────────

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
                ? a.overrides.grant.filter((p: string) => p !== permissionId)
                : [...a.overrides.grant, permissionId],
              revoke: a.overrides.revoke.filter((p: string) => p !== permissionId),
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
                ? a.overrides.revoke.filter((p: string) => p !== permissionId)
                : [...a.overrides.revoke, permissionId],
              grant: a.overrides.grant.filter((p: string) => p !== permissionId),
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
    isLoading,
    error,

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
    removeAssignment,
    toggleLocationForEmployee,
    setAllLocations,

    // Override mutations
    toggleOverrideGrant,
    toggleOverrideRevoke,
  } as const;
}

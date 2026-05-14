/**
 * useGroupMembers — manage employee assignments, location scope, and overrides
 * for a specific permission group.
 *
 * NOW CONNECTED TO REAL API
 */

import { useState, useCallback, useEffect } from 'react';
import {
  fetchEmployeePermissions,
  updateEmployeePermission,
  unassignEmployeePermission,
} from '@/lib/api';

export type LocationScope = 'all' | 'assigned' | 'specific';

export interface GroupMember {
  readonly employeeId: string;
  readonly employeeName: string;
  readonly employeeEmail?: string | null;
  readonly groupId: string;
  readonly groupName: string;
  readonly groupColor?: string;
  readonly locations: readonly { id: string; name: string }[];
  readonly locScope: string;
  readonly overrides: { grant: string[]; revoke: string[] };
}

export function useGroupMembers(groupId: string | null) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!groupId) {
      setMembers([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const all = await fetchEmployeePermissions();
      const filtered = all
        .filter((a) => a.groupId === groupId)
        .map((a) => ({
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
      setMembers(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const assignEmployee = useCallback(
    async (employeeId: string, locationScope: LocationScope = 'all') => {
      if (!groupId) return;
      setIsMutating(true);
      try {
        await updateEmployeePermission(employeeId, {
          groupId,
          locScope: locationScope,
          locationIds: [],
          overrides: { grant: [], revoke: [] },
        });
        await loadMembers();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to assign employee');
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [groupId, loadMembers]
  );

  const removeEmployee = useCallback(
    async (employeeId: string) => {
      setIsMutating(true);
      try {
        await unassignEmployeePermission(employeeId);
        setMembers((prev) => prev.filter((m) => m.employeeId !== employeeId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove employee');
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    []
  );

  const toggleLocation = useCallback(
    async (employeeId: string, locationId: string) => {
      const member = members.find((m) => m.employeeId === employeeId);
      if (!member || !groupId) return;

      const currentIds = member.locations.map((l) => l.id);
      const hasLocation = currentIds.includes(locationId);
      let nextIds: string[];
      let nextScope: LocationScope;

      if (member.locScope === 'all') {
        // Switching from all to specific: start with all EXCEPT toggled
        nextIds = members[0]?.locations?.map((l) => l.id) ?? [];
        nextIds = nextIds.filter((id) => id !== locationId);
        nextScope = 'specific';
      } else {
        nextIds = hasLocation
          ? currentIds.filter((id) => id !== locationId)
          : [...currentIds, locationId];
        nextScope = nextIds.length === 0 ? 'assigned' : 'specific';
      }

      // Optimistic update
      setMembers((prev) =>
        prev.map((m) =>
          m.employeeId === employeeId
            ? {
                ...m,
                locScope: nextScope,
                locations: nextIds.map(
                  (id) =>
                    member.locations.find((l) => l.id === id) ?? { id, name: '' }
                ) as { id: string; name: string }[],
              }
            : m
        )
      );

      setIsMutating(true);
      try {
        await updateEmployeePermission(employeeId, {
          groupId,
          locScope: nextScope,
          locationIds: nextIds,
          overrides: member.overrides,
        });
      } catch (err) {
        // Rollback on error
        await loadMembers();
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [members, groupId, loadMembers]
  );

  const setAllLocations = useCallback(
    async (employeeId: string, all: boolean) => {
      const member = members.find((m) => m.employeeId === employeeId);
      if (!member || !groupId) return;

      const nextScope: LocationScope = all ? 'all' : 'assigned';
      const nextIds: string[] = all ? member.locations.map((l) => l.id) : [];

      // Optimistic update
      setMembers((prev) =>
        prev.map((m) =>
          m.employeeId === employeeId
            ? { ...m, locScope: nextScope, locations: all ? m.locations : [] }
            : m
        )
      );

      setIsMutating(true);
      try {
        await updateEmployeePermission(employeeId, {
          groupId,
          locScope: nextScope,
          locationIds: nextIds,
          overrides: member.overrides,
        });
      } catch (err) {
        await loadMembers();
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [members, groupId, loadMembers]
  );

  const toggleOverrideGrant = useCallback(
    async (employeeId: string, permissionId: string) => {
      const member = members.find((m) => m.employeeId === employeeId);
      if (!member || !groupId) return;

      const hasGrant = member.overrides.grant.includes(permissionId);
      const nextOverrides = {
        grant: hasGrant
          ? member.overrides.grant.filter((p) => p !== permissionId)
          : [...member.overrides.grant, permissionId],
        revoke: member.overrides.revoke.filter((p) => p !== permissionId),
      };

      setMembers((prev) =>
        prev.map((m) =>
          m.employeeId === employeeId
            ? { ...m, overrides: nextOverrides }
            : m
        )
      );

      setIsMutating(true);
      try {
        await updateEmployeePermission(employeeId, {
          groupId,
          locScope: member.locScope as LocationScope,
          locationIds: member.locations.map((l) => l.id),
          overrides: nextOverrides,
        });
      } catch (err) {
        await loadMembers();
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [members, groupId, loadMembers]
  );

  const toggleOverrideRevoke = useCallback(
    async (employeeId: string, permissionId: string) => {
      const member = members.find((m) => m.employeeId === employeeId);
      if (!member || !groupId) return;

      const hasRevoke = member.overrides.revoke.includes(permissionId);
      const nextOverrides = {
        grant: member.overrides.grant.filter((p) => p !== permissionId),
        revoke: hasRevoke
          ? member.overrides.revoke.filter((p) => p !== permissionId)
          : [...member.overrides.revoke, permissionId],
      };

      setMembers((prev) =>
        prev.map((m) =>
          m.employeeId === employeeId
            ? { ...m, overrides: nextOverrides }
            : m
        )
      );

      setIsMutating(true);
      try {
        await updateEmployeePermission(employeeId, {
          groupId,
          locScope: member.locScope as LocationScope,
          locationIds: member.locations.map((l) => l.id),
          overrides: nextOverrides,
        });
      } catch (err) {
        await loadMembers();
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [members, groupId, loadMembers]
  );

  return {
    members,
    isLoading,
    isMutating,
    error,
    refresh: loadMembers,
    assignEmployee,
    removeEmployee,
    toggleLocation,
    setAllLocations,
    toggleOverrideGrant,
    toggleOverrideRevoke,
  };
}

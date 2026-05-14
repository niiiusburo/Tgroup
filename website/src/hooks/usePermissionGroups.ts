/**
 * usePermissionGroups — manage permission groups (CRUD + permission toggles)
 *
 * NOW CONNECTED TO REAL API
 * Assignment/location/override logic moved to useGroupMembers
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  fetchPermissionGroups,
  createPermissionGroup as apiCreateGroup,
  updatePermissionGroup as apiUpdateGroup,
  deletePermissionGroup as apiDeleteGroup,
  type PermissionGroup,
} from '@/lib/api';
import { PERMISSIONS } from '@/data/mockPermissionGroups';
import type { Permission } from '@/data/mockPermissionGroups';

export type { Permission, PermissionGroup };

export function usePermissionGroups() {
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const permissions: readonly Permission[] = PERMISSIONS;

  // Fetch groups from API
  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetched = await fetchPermissionGroups();
      setGroups(fetched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permission groups');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const permissionsByModule = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    for (const p of permissions) {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    }
    return grouped;
  }, [permissions]);

  /** Toggle a single permission on/off for a group — calls API */
  const toggleGroupPermission = useCallback(
    async (groupId: string, permissionId: string) => {
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      const has = group.permissions.includes(permissionId);
      const nextPermissions = has
        ? group.permissions.filter((p) => p !== permissionId)
        : [...group.permissions, permissionId];

      // Optimistic update
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, permissions: nextPermissions } : g
        )
      );

      setIsMutating(true);
      try {
        await apiUpdateGroup(groupId, { permissions: nextPermissions });
      } catch (err) {
        // Rollback on error
        setError(err instanceof Error ? err.message : 'Failed to update permission');
        setGroups((prev) =>
          prev.map((g) =>
            g.id === groupId ? { ...g, permissions: group.permissions } : g
          )
        );
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [groups]
  );

  /** Create a new group — calls API */
  const createGroup = useCallback(
    async (name: string, color: string, description: string) => {
      setIsMutating(true);
      try {
        const newGroup = await apiCreateGroup({
          name,
          color,
          description,
          permissions: ['overview.view'],
        });
        setGroups((prev) => [...prev, newGroup]);
        return newGroup;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create group');
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    []
  );

  /** Delete a group — calls API */
  const deleteGroup = useCallback(
    async (groupId: string) => {
      setIsMutating(true);
      try {
        await apiDeleteGroup(groupId);
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        if (selectedGroupId === groupId) {
          setSelectedGroupId(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete group');
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [selectedGroupId]
  );

  /** Update group metadata (name/color/description) — calls API */
  const updateGroup = useCallback(
    async (
      groupId: string,
      updates: { name?: string; color?: string; description?: string }
    ) => {
      setIsMutating(true);
      try {
        const updated = await apiUpdateGroup(groupId, updates);
        setGroups((prev) =>
          prev.map((g) => (g.id === groupId ? updated : g))
        );
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update group');
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    []
  );

  /** Toggle all permissions in a module on/off */
  const toggleModulePermissions = useCallback(
    async (groupId: string, module: string, enable: boolean) => {
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      const modulePerms = permissionsByModule[module]?.map((p) => p.id) ?? [];
      const nextPermissions = enable
        ? [...new Set([...group.permissions, ...modulePerms])]
        : group.permissions.filter((p) => !modulePerms.includes(p));

      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, permissions: nextPermissions } : g
        )
      );

      setIsMutating(true);
      try {
        await apiUpdateGroup(groupId, { permissions: nextPermissions });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update permissions');
        setGroups((prev) =>
          prev.map((g) =>
            g.id === groupId ? { ...g, permissions: group.permissions } : g
          )
        );
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [groups, permissionsByModule]
  );

  return {
    // Data
    groups,
    permissions,
    permissionsByModule,
    isLoading,
    isMutating,
    error,
    selectedGroup,
    selectedGroupId,
    setSelectedGroupId,

    // Mutations
    toggleGroupPermission,
    toggleModulePermissions,
    createGroup,
    deleteGroup,
    updateGroup,

    // Actions
    refresh: loadGroups,
    clearError: () => setError(null),
  };
}

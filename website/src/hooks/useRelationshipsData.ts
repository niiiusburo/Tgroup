/**
 * State management for the Relationships page
 * NOW CONNECTED TO REAL API
 * @crossref:used-in[Relationships]
 * @crossref:uses[api, entityGraph]
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  fetchPermissionGroups,
  updatePermissionGroup,
} from '@/lib/api';
import { ENTITY_NODES, ENTITY_RELATIONS } from '@/constants/entityGraph';

export type RelationshipsTab = 'permissions' | 'entities';

// Role interface matching the PermissionMatrix component expectations
export interface Role {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly description: string;
  readonly permissions: readonly string[];
}

type PermissionState = {
  readonly [roleId: string]: {
    readonly [permissionId: string]: boolean;
  };
};

interface UseRelationshipsDataState {
  readonly roles: readonly Role[];
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly error: string | null;
  readonly saveSuccess: boolean;
}

export function useRelationshipsData() {
  const [activeTab, setActiveTab] = useState<RelationshipsTab>('permissions');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  
  // Track permission edits with dirty state
  const [editedPermissions, setEditedPermissions] = useState<PermissionState>({});
  const [isDirty, setIsDirty] = useState(false);

  // API state
  const [state, setState] = useState<UseRelationshipsDataState>({
    roles: [],
    isLoading: true,
    isSaving: false,
    error: null,
    saveSuccess: false,
  });

  // Fetch permission groups from API
  useEffect(() => {
    async function loadPermissionGroups() {
      try {
        const groups = await fetchPermissionGroups();
        // Map PermissionGroup to Role to match PermissionMatrix expectations
        const roles: readonly Role[] = groups.map((g) => ({
          id: g.id,
          name: g.name,
          color: g.color,
          description: g.description ?? '',
          permissions: g.permissions,
        }));
        setState((prev) => ({ ...prev, roles, isLoading: false, error: null }));
      } catch (err) {
        console.error('useRelationshipsData: failed to fetch permission groups', err);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to load permissions',
        }));
      }
    }

    loadPermissionGroups();
  }, []);

  // Extract all unique permissions from groups
  const allPermissions = useMemo(() => {
    const permSet = new Map<string, { id: string; module: string; action: string; description: string }>();
    for (const group of state.roles) {
      for (const permId of group.permissions) {
        if (!permSet.has(permId)) {
          const [modulePart, actionPart] = permId.split('.');
          const module = modulePart.charAt(0).toUpperCase() + modulePart.slice(1);
          const action = actionPart.charAt(0).toUpperCase() + actionPart.slice(1);
          permSet.set(permId, {
            id: permId,
            module,
            action,
            description: `${action} ${module}`,
          });
        }
      }
    }
    return Array.from(permSet.values());
  }, [state.roles]);

  const modules = useMemo(() => {
    const moduleSet = new Set(allPermissions.map((p) => p.module));
    return Array.from(moduleSet);
  }, [allPermissions]);

  const permissionMatrix = useMemo(() => {
    return modules.map((module) => {
      const modulePerms = allPermissions.filter((p) => p.module === module);
      const roleAccess = state.roles.map((role) => ({
        roleId: role.id,
        roleName: role.name,
        permissions: modulePerms.map((p) => {
          // Check if this permission has been edited
          const editedRole = editedPermissions[role.id];
          const granted = editedRole !== undefined 
            ? editedRole[p.id] ?? role.permissions.includes(p.id)
            : role.permissions.includes(p.id);
          return {
            id: p.id,
            action: p.action,
            granted,
          };
        }),
      }));
      return { module, permissions: modulePerms, roleAccess };
    });
  }, [modules, allPermissions, state.roles, editedPermissions]);

  const selectedEntityRelations = useMemo(() => {
    if (!selectedEntityId) return [];
    return ENTITY_RELATIONS.filter(
      (r) => r.from === selectedEntityId || r.to === selectedEntityId,
    );
  }, [selectedEntityId]);

  const toggleEntity = useCallback((entityId: string) => {
    setSelectedEntityId((prev) => (prev === entityId ? null : entityId));
  }, []);

  const toggleRole = useCallback((roleId: string) => {
    setSelectedRoleId((prev) => (prev === roleId ? null : roleId));
  }, []);

  const togglePermission = useCallback((roleId: string, permissionId: string, currentGranted: boolean) => {
    setEditedPermissions((prev) => ({
      ...prev,
      [roleId]: {
        ...(prev[roleId] || {}),
        [permissionId]: !currentGranted,
      },
    }));
    setIsDirty(true);
    setState((prev) => ({ ...prev, saveSuccess: false }));
  }, []);

  const savePermissions = useCallback(async () => {
    if (!selectedRoleId || Object.keys(editedPermissions).length === 0) {
      return;
    }

    setState((prev) => ({ ...prev, isSaving: true, error: null }));

    try {
      // Find the role being edited
      const role = state.roles.find((r) => r.id === selectedRoleId);
      if (!role) {
        throw new Error('Role not found');
      }

      // Calculate the new permission set for this role
      const editedRole = editedPermissions[selectedRoleId];
      const newPermissions = role.permissions.filter((p) => {
        // If edited, use the edited value; otherwise keep original
        return editedRole === undefined || editedRole[p] !== false;
      });
      
      // Add any new permissions that were toggled on
      for (const [permId, granted] of Object.entries(editedRole ?? {})) {
        if (granted && !newPermissions.includes(permId)) {
          newPermissions.push(permId);
        }
      }

      // Call API to update the permission group with the new permission set
      await updatePermissionGroup(selectedRoleId, {
        name: role.name,
        color: role.color,
        description: role.description,
        permissions: newPermissions,
      });

      // Update local roles state to reflect saved changes
      setState((prev) => ({
        ...prev,
        roles: prev.roles.map((r) =>
          r.id === selectedRoleId ? { ...r, permissions: newPermissions } : r
        ),
        isSaving: false,
        saveSuccess: true,
      }));
      setIsDirty(false);
      // Reset edited permissions after save
      setEditedPermissions({});
    } catch (err) {
      console.error('useRelationshipsData: failed to save permissions', err);
      setState((prev) => ({
        ...prev,
        isSaving: false,
        error: err instanceof Error ? err.message : 'Failed to save permissions',
      }));
    }
  }, [selectedRoleId, editedPermissions, state.roles]);

  const resetPermissions = useCallback(() => {
    setEditedPermissions({});
    setIsDirty(false);
    setState((prev) => ({ ...prev, saveSuccess: false }));
  }, []);

  return {
    activeTab,
    setActiveTab,
    selectedRoleId,
    toggleRole,
    selectedEntityId,
    toggleEntity,
    modules,
    roles: state.roles,
    permissions: allPermissions,
    permissionMatrix,
    entityNodes: ENTITY_NODES,
    entityRelations: ENTITY_RELATIONS,
    selectedEntityRelations,
    isDirty,
    togglePermission,
    savePermissions,
    resetPermissions,
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    error: state.error,
    saveSuccess: state.saveSuccess,
  } as const;
}

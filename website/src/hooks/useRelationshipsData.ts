/**
 * State management for the Relationships page
 * @crossref:used-in[Relationships]
 * @crossref:uses[mockPermissions, usePermissions]
 */

import { useState, useCallback, useMemo } from 'react';
import { ROLES, PERMISSIONS, ENTITY_NODES, ENTITY_RELATIONS } from '@/data/mockPermissions';


export type RelationshipsTab = 'permissions' | 'entities';

type PermissionState = {
  readonly [roleId: string]: {
    readonly [permissionId: string]: boolean;
  };
};

export function useRelationshipsData() {
  const [activeTab, setActiveTab] = useState<RelationshipsTab>('permissions');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  
  // Track permission edits with dirty state
  const [editedPermissions, setEditedPermissions] = useState<PermissionState>({});
  const [isDirty, setIsDirty] = useState(false);

  const modules = useMemo(() => {
    const moduleSet = new Set(PERMISSIONS.map((p) => p.module));
    return Array.from(moduleSet);
  }, []);

  const permissionMatrix = useMemo(() => {
    return modules.map((module) => {
      const modulePerms = PERMISSIONS.filter((p) => p.module === module);
      const roleAccess = ROLES.map((role) => ({
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
  }, [modules, editedPermissions]);

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
  }, []);

  const savePermissions = useCallback(() => {
    // In a real app, this would save to the backend
    console.log('Saving permissions:', editedPermissions);
    setIsDirty(false);
    // Reset edited permissions after save
    setEditedPermissions({});
  }, [editedPermissions]);

  const resetPermissions = useCallback(() => {
    setEditedPermissions({});
    setIsDirty(false);
  }, []);

  return {
    activeTab,
    setActiveTab,
    selectedRoleId,
    toggleRole,
    selectedEntityId,
    toggleEntity,
    modules,
    roles: ROLES,
    permissions: PERMISSIONS,
    permissionMatrix,
    entityNodes: ENTITY_NODES,
    entityRelations: ENTITY_RELATIONS,
    selectedEntityRelations,
    isDirty,
    togglePermission,
    savePermissions,
    resetPermissions,
  } as const;
}

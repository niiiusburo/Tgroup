/**
 * State management for the Relationships page
 * @crossref:used-in[Relationships]
 * @crossref:uses[mockPermissions, usePermissions]
 */

import { useState, useCallback, useMemo } from 'react';
import { ROLES, PERMISSIONS, ENTITY_NODES, ENTITY_RELATIONS } from '@/data/mockPermissions';

export type RelationshipsTab = 'permissions' | 'entities';

export function useRelationshipsData() {
  const [activeTab, setActiveTab] = useState<RelationshipsTab>('permissions');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

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
        permissions: modulePerms.map((p) => ({
          id: p.id,
          action: p.action,
          granted: role.permissions.includes(p.id),
        })),
      }));
      return { module, permissions: modulePerms, roleAccess };
    });
  }, [modules]);

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
  } as const;
}

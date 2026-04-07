/**
 * Permission checking hook
 * @crossref:used-in[ALL_PAGES]
 * @crossref:uses[mockPermissions]
 */

import { useState, useCallback, useMemo } from 'react';
import { ROLES, PERMISSIONS } from '@/data/mockPermissions';
import type { Role, Permission } from '@/data/mockPermissions';

export function usePermissions(defaultRoleId = 'admin') {
  const [currentRoleId, setCurrentRoleId] = useState(defaultRoleId);

  const currentRole = useMemo(
    () => ROLES.find((r) => r.id === currentRoleId) ?? ROLES[0],
    [currentRoleId],
  );

  const hasPermission = useCallback(
    (permissionId: string): boolean => {
      return currentRole.permissions.includes(permissionId);
    },
    [currentRole],
  );

  const hasModuleAccess = useCallback(
    (module: string): boolean => {
      return PERMISSIONS.some(
        (p) => p.module === module && currentRole.permissions.includes(p.id),
      );
    },
    [currentRole],
  );

  const getModulePermissions = useCallback(
    (module: string): readonly Permission[] => {
      return PERMISSIONS.filter((p) => p.module === module);
    },
    [],
  );

  const getPermissionsByRole = useCallback(
    (roleId: string): readonly string[] => {
      const role = ROLES.find((r) => r.id === roleId);
      return role?.permissions ?? [];
    },
    [],
  );

  return {
    currentRole,
    currentRoleId,
    setCurrentRoleId,
    roles: ROLES as readonly Role[],
    permissions: PERMISSIONS as readonly Permission[],
    hasPermission,
    hasModuleAccess,
    getModulePermissions,
    getPermissionsByRole,
  } as const;
}

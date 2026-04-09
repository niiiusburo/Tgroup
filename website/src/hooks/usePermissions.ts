/**
 * Permission checking hook
 * NOW CONNECTED TO REAL API via AuthContext + Permissions API
 * @crossref:used-in[ALL_PAGES]
 * @crossref:uses[AuthContext, api]
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchPermissionGroups } from '@/lib/api';

export interface Permission {
  readonly id: string;
  readonly module: string;
  readonly action: string;
  readonly description: string;
}

export interface Role {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly description: string;
  readonly permissions: readonly string[];
}

interface UsePermissionsState {
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

export function usePermissions(defaultRoleId = 'admin') {
  const { permissions: authPermissions, isAuthenticated } = useAuth();
  const [currentRoleId, setCurrentRoleId] = useState(defaultRoleId);
  
  // State for API-fetched permission groups
  const [state, setState] = useState<UsePermissionsState>({
    roles: [],
    permissions: [],
    isLoading: true,
    error: null,
  });

  // Fetch permission groups from API on mount
  useEffect(() => {
    async function loadPermissionGroups() {
      try {
        const groups = await fetchPermissionGroups();
        
        // Extract all unique permissions from groups
        const allPermissions = new Map<string, Permission>();
        for (const group of groups) {
          for (const permId of group.permissions) {
            // Parse permission ID (e.g., "overview.view" → module: "Overview", action: "View")
            const [modulePart, actionPart] = permId.split('.');
            const module = modulePart.charAt(0).toUpperCase() + modulePart.slice(1);
            const action = actionPart.charAt(0).toUpperCase() + actionPart.slice(1);
            
            if (!allPermissions.has(permId)) {
              allPermissions.set(permId, {
                id: permId,
                module,
                action,
                description: `${action} ${module}`,
              });
            }
          }
        }

        // Convert groups to roles format
        const roles: Role[] = groups.map((g) => ({
          id: g.id,
          name: g.name,
          color: g.color,
          description: g.description ?? '',
          permissions: g.permissions,
        }));

        setState({
          roles,
          permissions: Array.from(allPermissions.values()),
          isLoading: false,
          error: null,
        });
      } catch (err) {
        console.error('usePermissions: failed to fetch permission groups', err);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to load permissions',
        }));
      }
    }

    loadPermissionGroups();
  }, []);

  // Use auth permissions if user is authenticated, otherwise use fetched roles
  const currentRole = useMemo(() => {
    if (isAuthenticated && authPermissions) {
      // Find the role matching the user's group
      const matchingRole = state.roles.find((r) => r.id === authPermissions.groupId);
      return matchingRole ?? {
        id: authPermissions.groupId,
        name: authPermissions.groupName,
        color: '#6366F1',
        description: 'User Role',
        permissions: authPermissions.effectivePermissions,
      };
    }
    return state.roles.find((r) => r.id === currentRoleId) ?? state.roles[0];
  }, [isAuthenticated, authPermissions, currentRoleId, state.roles]);

  const hasPermission = useCallback(
    (permissionId: string): boolean => {
      // Use auth permissions if authenticated
      if (isAuthenticated && authPermissions) {
        if (authPermissions.effectivePermissions.includes('*')) return true;
        return authPermissions.effectivePermissions.includes(permissionId);
      }
      // Fall back to role-based check
      return currentRole?.permissions.includes(permissionId) ?? false;
    },
    [isAuthenticated, authPermissions, currentRole],
  );

  const hasModuleAccess = useCallback(
    (module: string): boolean => {
      const modulePerms = state.permissions.filter((p) => p.module === module);
      if (isAuthenticated && authPermissions) {
        return modulePerms.some((p) => authPermissions.effectivePermissions.includes(p.id));
      }
      return modulePerms.some((p) => currentRole?.permissions.includes(p.id));
    },
    [isAuthenticated, authPermissions, currentRole, state.permissions],
  );

  const getModulePermissions = useCallback(
    (module: string): readonly Permission[] => {
      return state.permissions.filter((p) => p.module === module);
    },
    [state.permissions],
  );

  const getPermissionsByRole = useCallback(
    (roleId: string): readonly string[] => {
      const role = state.roles.find((r) => r.id === roleId);
      return role?.permissions ?? [];
    },
    [state.roles],
  );

  return {
    currentRole,
    currentRoleId,
    setCurrentRoleId,
    roles: state.roles as readonly Role[],
    permissions: state.permissions as readonly Permission[],
    hasPermission,
    hasModuleAccess,
    getModulePermissions,
    getPermissionsByRole,
    isLoading: state.isLoading,
    error: state.error,
  } as const;
}

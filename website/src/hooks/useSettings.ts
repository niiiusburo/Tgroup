/**
 * Settings state management hook
 * @crossref:used-in[Settings, ServiceCatalogSettings, RoleConfig, CustomerSourcesConfig, SystemPreferences]
 */

import { useState, useMemo } from 'react';
import {
  MOCK_CATALOG_SERVICES,
  MOCK_CUSTOMER_SOURCES,
  MOCK_SYSTEM_PREFERENCES,
  type CatalogService,
  type CustomerSource,
  type SystemPreference,
} from '@/data/mockSettings';
import { ROLES, PERMISSIONS, type Role, type Permission } from '@/data/mockPermissions';

// --- Service Catalog ---

export function useServiceCatalog() {
  const [services, setServices] = useState<CatalogService[]>([...MOCK_CATALOG_SERVICES]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (!showInactive && !s.isActive) return false;
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [services, searchTerm, categoryFilter, showInactive]);

  const stats = useMemo(() => ({
    total: services.length,
    active: services.filter((s) => s.isActive).length,
    inactive: services.filter((s) => !s.isActive).length,
    categories: [...new Set(services.map((s) => s.category))].length,
  }), [services]);

  function toggleServiceActive(id: string) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  }

  function updateService(id: string, updates: Partial<Pick<CatalogService, 'name' | 'price' | 'duration' | 'visits' | 'description'>>) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }

  function addService(service: Omit<CatalogService, 'id'>) {
    const newId = `cat-${Date.now()}`;
    setServices((prev) => [...prev, { ...service, id: newId }]);
  }

  return {
    services: filtered,
    stats,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    showInactive,
    setShowInactive,
    toggleServiceActive,
    updateService,
    addService,
  };
}

// --- Role Config ---

export function useRoleConfig() {
  const [roles, setRoles] = useState<Role[]>([...ROLES] as Role[]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const permissions: readonly Permission[] = PERMISSIONS;

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  );

  const permissionsByModule = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    for (const p of permissions) {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    }
    return grouped;
  }, [permissions]);

  function togglePermission(roleId: string, permissionId: string) {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== roleId) return r;
        const has = r.permissions.includes(permissionId);
        return {
          ...r,
          permissions: has
            ? r.permissions.filter((p) => p !== permissionId)
            : [...r.permissions, permissionId],
        };
      })
    );
  }

  function updateRoleDescription(roleId: string, description: string) {
    setRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, description } : r))
    );
  }

  return {
    roles,
    selectedRole,
    selectedRoleId,
    setSelectedRoleId,
    permissions,
    permissionsByModule,
    togglePermission,
    updateRoleDescription,
  };
}

// --- Customer Sources ---

export function useCustomerSources() {
  const [sources, setSources] = useState<CustomerSource[]>([...MOCK_CUSTOMER_SOURCES]);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return sources;
    return sources.filter((s) => s.type === typeFilter);
  }, [sources, typeFilter]);

  const stats = useMemo(() => ({
    total: sources.length,
    active: sources.filter((s) => s.isActive).length,
    totalCustomers: sources.reduce((sum, s) => sum + s.customerCount, 0),
    topSource: [...sources].sort((a, b) => b.customerCount - a.customerCount)[0]?.name ?? '-',
  }), [sources]);

  function toggleSourceActive(id: string) {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  }

  function addSource(source: Omit<CustomerSource, 'id' | 'customerCount'>) {
    const newId = `src-${Date.now()}`;
    setSources((prev) => [...prev, { ...source, id: newId, customerCount: 0 }]);
  }

  function removeSource(id: string) {
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  return {
    sources: filtered,
    allSources: sources,
    stats,
    typeFilter,
    setTypeFilter,
    toggleSourceActive,
    addSource,
    removeSource,
  };
}

// --- System Preferences ---

export function useSystemPreferences() {
  const [preferences, setPreferences] = useState<SystemPreference[]>([...MOCK_SYSTEM_PREFERENCES]);

  const groups = useMemo(() => {
    const grouped: Record<string, SystemPreference[]> = {};
    for (const p of preferences) {
      if (!grouped[p.group]) grouped[p.group] = [];
      grouped[p.group].push(p);
    }
    return grouped;
  }, [preferences]);

  function updatePreference(key: string, value: string | number | boolean) {
    setPreferences((prev) =>
      prev.map((p) => (p.key === key ? { ...p, value } : p))
    );
  }

  return { preferences, groups, updatePreference };
}

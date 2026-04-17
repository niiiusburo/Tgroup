/**
 * Settings state management hook
 * Uses real backend API for customer sources and system preferences
 * @crossref:used-in[Settings, ServiceCatalogSettings, RoleConfig, CustomerSourcesConfig, SystemPreferences]
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { normalizeText } from '@/lib/utils';
import type { CustomerSource, SystemPreference, CatalogService } from '@/types/settings';
import { PERMISSIONS, ROLES } from '@/data/mockPermissionGroups';
import type { Permission } from '@/data/mockPermissionGroups';
import type { Role } from '@/types/permissions';
import { fetchProducts, fetchCustomerSources, createCustomerSource, updateCustomerSource, deleteCustomerSource, fetchSystemPreferences, upsertSystemPreference, updateSystemPreference, deleteSystemPreference, type ApiCustomerSource, type ApiSystemPreference } from '@/lib/api';

// Export types
export type { CustomerSource, SystemPreference, CatalogService };
export type { Role, Permission };

// ─── Service Catalog ──────────────────────────────────────────────

export interface ApiCatalogService {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  visits: number;
  isActive: boolean;
}

export function useServiceCatalog() {
  const [services, setServices] = useState<ApiCatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchProducts({ limit: 200 })
      .then((res) => {
        const mapped: ApiCatalogService[] = res.items.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.categname ?? 'Other',
          description: p.defaultcode ?? '',
          price: p.listprice ? parseFloat(p.listprice) : 0,
          duration: 0,
          visits: 1,
          isActive: p.active,
        }));
        setServices(mapped);
      })
      .catch(() => {
        // Keep empty state on error
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (!showInactive && !s.isActive) return false;
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (searchTerm) {
        const q = normalizeText(searchTerm);
        return normalizeText(s.name).includes(q) || normalizeText(s.description).includes(q);
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

  function updateService(id: string, updates: Partial<Pick<ApiCatalogService, 'name' | 'price' | 'duration' | 'visits' | 'description'>>) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }

  function addService(service: Omit<ApiCatalogService, 'id'>) {
    const newId = `cat-${Date.now()}`;
    setServices((prev) => [...prev, { ...service, id: newId }]);
  }

  return {
    services: filtered,
    loading,
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

// ─── Role Config ─────────────────────────────────────────────────

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

// ─── Customer Sources ────────────────────────────────────────────

// Default customer sources (fallback when API fails) — keys are looked up in settings.json
const DEFAULT_CUSTOMER_SOURCES: readonly CustomerSource[] = [
  { id: 'src-1', name: 'settings.customerSourceDefaults.saleOnline', type: 'online', description: 'settings.customerSourceDefaults.saleOnlineDesc', isActive: true, customerCount: 0 },
  { id: 'src-2', name: 'settings.customerSourceDefaults.walkIn', type: 'offline', description: 'settings.customerSourceDefaults.walkInDesc', isActive: true, customerCount: 0 },
  { id: 'src-3', name: 'settings.customerSourceDefaults.hotline', type: 'online', description: 'settings.customerSourceDefaults.hotlineDesc', isActive: true, customerCount: 0 },
  { id: 'src-4', name: 'settings.customerSourceDefaults.returning', type: 'referral', description: 'settings.customerSourceDefaults.returningDesc', isActive: true, customerCount: 0 },
  { id: 'src-5', name: 'settings.customerSourceDefaults.referral', type: 'referral', description: 'settings.customerSourceDefaults.referralDesc', isActive: true, customerCount: 0 },
  { id: 'src-6', name: 'settings.customerSourceDefaults.internalReferral', type: 'referral', description: 'settings.customerSourceDefaults.internalReferralDesc', isActive: true, customerCount: 0 },
  { id: 'src-7', name: 'settings.customerSourceDefaults.mkt1', type: 'online', description: 'settings.customerSourceDefaults.mkt1Desc', isActive: true, customerCount: 0 },
  { id: 'src-8', name: 'settings.customerSourceDefaults.dncb', type: 'offline', description: 'settings.customerSourceDefaults.dncbDesc', isActive: true, customerCount: 0 },
];

function mapApiSource(api: ApiCustomerSource): CustomerSource {
  return {
    id: api.id,
    name: api.name,
    type: api.type,
    description: api.description || '',
    isActive: api.is_active,
    customerCount: api.customer_count,
  };
}

export function useCustomerSources() {
  const [sources, setSources] = useState<CustomerSource[]>([...DEFAULT_CUSTOMER_SOURCES]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fetch from API
  const loadSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCustomerSources({
        type: typeFilter !== 'all' ? typeFilter : undefined,
      });
      if (response.items.length > 0) {
        setSources(response.items.map(mapApiSource));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources');
      // Keep defaults on error
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

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

  async function toggleSourceActive(id: string) {
    const source = sources.find(s => s.id === id);
    if (!source) return;
    try {
      await updateCustomerSource(id, { is_active: !source.isActive });
      setSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update source');
    }
  }

  async function addSource(source: Omit<CustomerSource, 'id' | 'customerCount'>) {
    try {
      const apiSource = await createCustomerSource({
        name: source.name,
        type: source.type,
        description: source.description,
        is_active: source.isActive,
      });
      setSources((prev) => [...prev, mapApiSource(apiSource)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add source');
      throw err;
    }
  }

  async function removeSource(id: string) {
    try {
      await deleteCustomerSource(id);
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete source');
      throw err;
    }
  }

  return {
    sources: filtered,
    allSources: sources,
    loading,
    error,
    stats,
    typeFilter,
    setTypeFilter,
    toggleSourceActive,
    addSource,
    removeSource,
    refresh: loadSources,
  };
}

// ─── System Preferences ───────────────────────────────────────────

// Default preferences (fallback when API fails)
const DEFAULT_PREFERENCES: readonly SystemPreference[] = [
  { id: 'pref-1', key: 'clinic_name', value: 'TG Clinic', type: 'string', category: 'General', description: 'Clinic name', isPublic: true },
  { id: 'pref-2', key: 'timezone', value: 'Asia/Ho_Chi_Minh', type: 'string', category: 'General', description: 'Timezone', isPublic: true },
  { id: 'pref-3', key: 'currency', value: 'VND', type: 'string', category: 'General', description: 'Currency', isPublic: true },
];

function mapApiPref(api: ApiSystemPreference): SystemPreference {
  return {
    id: api.id,
    key: api.key,
    value: api.value,
    type: api.type as SystemPreference['type'],
    category: api.category,
    description: api.description || '',
    isPublic: api.is_public,
  };
}

export function useSystemPreferences() {
  const [preferences, setPreferences] = useState<SystemPreference[]>([...DEFAULT_PREFERENCES]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch from API
  const loadPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchSystemPreferences();
      if (response.items.length > 0) {
        setPreferences(response.items.map(mapApiPref));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
      // Keep defaults on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const groups = useMemo(() => {
    const grouped: Record<string, SystemPreference[]> = {};
    for (const p of preferences) {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    }
    return grouped;
  }, [preferences]);

  async function updatePreference(key: string, value: string | number | boolean) {
    try {
      await updateSystemPreference(key, { value: String(value) });
      setPreferences((prev) =>
        prev.map((p) => (p.key === key ? { ...p, value: String(value) } : p))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preference');
      throw err;
    }
  }

  async function addPreference(pref: Omit<SystemPreference, 'id'>) {
    try {
      const apiPref = await upsertSystemPreference({
        key: pref.key,
        value: pref.value,
        type: pref.type,
        category: pref.category,
        description: pref.description,
        is_public: pref.isPublic,
      });
      setPreferences((prev) => [...prev, mapApiPref(apiPref)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add preference');
      throw err;
    }
  }

  async function removePreference(key: string) {
    try {
      await deleteSystemPreference(key);
      setPreferences((prev) => prev.filter((p) => p.key !== key));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete preference');
      throw err;
    }
  }

  return { 
    preferences, 
    groups, 
    loading,
    error,
    updatePreference, 
    addPreference,
    removePreference,
    refresh: loadPreferences,
  };
}

/**
 * BusinessUnitContext — LOB (Line of Business) toggle context
 * Mirrors LocationContext exactly for consistency.
 *
 * @crossref:used-in[Layout, App, all data-fetch hooks]
 * @crossref:uses[useAuth]
 *
 * Part of Cosmetic LOB v2 (north star: docs/superpowers/specs/2026-05-18-cosmetic-line-of-business-design-v2.md)
 */

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type BusinessUnit = 'dental' | 'cosmetic';

export interface BusinessUnitContextValue {
  readonly currentLOB: BusinessUnit;
  readonly setCurrentLOB: (lob: BusinessUnit) => void;
  readonly availableLOBs: BusinessUnit[];
  readonly isMultiLOBUser: boolean;
  readonly isCosmeticEnabled: boolean;
}

const BusinessUnitContext = createContext<BusinessUnitContextValue | null>(null);

const STORAGE_KEY = 'tgclinic_lob';
const CHANGE_EVENT = 'tgclinic:lob-change';
const ADMIN_GROUP_ID = '11111111-0000-0000-0000-000000000001';

function isBusinessUnit(value: unknown): value is BusinessUnit {
  return value === 'dental' || value === 'cosmetic';
}

function isCosmeticFlagEnabled(): boolean {
  const viteFlag = (import.meta as any).env?.VITE_COSMETIC_LOB_ENABLED;
  const testFlag = (globalThis as any).process?.env?.VITE_COSMETIC_LOB_ENABLED;
  return viteFlag === 'true' || testFlag === 'true';
}

function readRequestedInitialLob(): BusinessUnit {
  if (!isCosmeticFlagEnabled() || typeof window === 'undefined') {
    return 'dental';
  }

  const params = new URLSearchParams(window.location.search);
  const queryLob = params.get('lob');
  if (isBusinessUnit(queryLob)) {
    return queryLob;
  }

  const persisted = window.localStorage.getItem(STORAGE_KEY);
  return isBusinessUnit(persisted) ? persisted : 'dental';
}

interface Props {
  readonly children: ReactNode;
}

export function BusinessUnitProvider({ children }: Props) {
  const { user, permissions, isLoading: authLoading } = useAuth();
  const [currentLOB, setCurrentLOBState] = useState<BusinessUnit>(() => readRequestedInitialLob());
  const [availableLOBs, setAvailableLOBs] = useState<BusinessUnit[]>(() => {
    const initialLob = readRequestedInitialLob();
    return initialLob === 'cosmetic' ? ['dental', 'cosmetic'] : ['dental'];
  });
  const [isCosmeticEnabled, setIsCosmeticEnabled] = useState(() => isCosmeticFlagEnabled());

  const isAdminBusinessUnitUser = useMemo(() => {
    const groupId = String(permissions?.groupId || '').trim().toLowerCase();
    const groupName = String(permissions?.groupName || '').trim().toLowerCase();
    return (
      groupId === ADMIN_GROUP_ID ||
      groupName === 'admin' ||
      groupName === 'super admin' ||
      groupName === 'system administrator'
    );
  }, [permissions]);

  // Derive LOB scope from authenticated user + feature flag (primary path)
  // Also reacts to auth-change custom event for cross-context sync (LocationContext pattern)
  const deriveAndSet = useCallback((userFromAuth?: any, fromEvent?: any) => {
    const flag = isCosmeticFlagEnabled();
    setIsCosmeticEnabled(flag);

    const sourceUser = fromEvent?.user ?? userFromAuth ?? user;
    const scopes: string[] = (sourceUser as any)?.lob_scope || [];
    const normalized: BusinessUnit[] = scopes
      .filter((s: string): s is BusinessUnit => isBusinessUnit(s));

    // Admins implicitly get both LOBs when the cosmetic flag is enabled,
    // so pre-migration admin accounts (with null lob_scope) still see the toggle.
    const finalAvailable: BusinessUnit[] = flag && isAdminBusinessUnitUser
      ? (normalized.length > 0 ? normalized : ['dental', 'cosmetic'])
      : (flag && normalized.length > 0
          ? normalized.slice(0, 1)
          : ['dental']);
    setAvailableLOBs(finalAvailable);

    // Support ?lob=cosmetic (or dental) query param for cross-LOB badge deep links (new tab from probe match).
    // Query param takes precedence over localStorage for the initial derive (allows forcing opposite LOB without polluting persisted state).
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const queryLob = (searchParams?.get('lob') as BusinessUnit | null) || null;
    const forcedLob = isBusinessUnit(queryLob) ? queryLob : null;

    const persisted = typeof window !== 'undefined'
      ? (window.localStorage.getItem(STORAGE_KEY) as BusinessUnit | null)
      : null;
    let next: BusinessUnit = persisted && finalAvailable.includes(persisted as BusinessUnit)
      ? (persisted as BusinessUnit)
      : (finalAvailable[0] ?? 'dental');

    if (forcedLob && finalAvailable.includes(forcedLob)) {
      next = forcedLob;
    }

    // If auth still loading, keep prior or default; will re-derive on user settle
    if (!authLoading) {
      setCurrentLOBState(next);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { lob: next } }));
      }
    }
  }, [user, isAdminBusinessUnitUser, authLoading]);

  useEffect(() => {
    deriveAndSet(user);
  }, [user, deriveAndSet]);

  // Mirror LocationContext: listen for auth-change events (future-proof for enriched payload with lob info)
  useEffect(() => {
    function handleAuthChange(e: Event) {
      const detail = (e as CustomEvent<any>).detail;
      if (detail && (detail.user || detail.lob_scope)) {
        deriveAndSet(detail.user, detail);
      }
    }
    window.addEventListener('tgclinic:auth-change', handleAuthChange);
    return () => window.removeEventListener('tgclinic:auth-change', handleAuthChange);
  }, [deriveAndSet]);

  const setCurrentLOB = useCallback((lob: BusinessUnit) => {
    if (!availableLOBs.includes(lob)) return;
    window.localStorage.setItem(STORAGE_KEY, lob);
    setCurrentLOBState(lob);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { lob } }));
  }, [availableLOBs]);

  const isMultiLOBUser = isAdminBusinessUnitUser && availableLOBs.length >= 2;

  // Stable context value per React Context best practices (memoized)
  const value = useMemo<BusinessUnitContextValue>(
    () => ({
      currentLOB,
      setCurrentLOB,
      availableLOBs,
      isMultiLOBUser,
      isCosmeticEnabled,
    }),
    [currentLOB, setCurrentLOB, availableLOBs, isMultiLOBUser, isCosmeticEnabled]
  );

  return (
    <BusinessUnitContext.Provider value={value}>
      {children}
    </BusinessUnitContext.Provider>
  );
}

export function useBusinessUnit(): BusinessUnitContextValue {
  const ctx = useContext(BusinessUnitContext);
  if (!ctx) {
    throw new Error('useBusinessUnit must be used inside BusinessUnitProvider');
  }
  return ctx;
}

/**
 * Non-throwing accessor. Returns null when no BusinessUnitProvider is mounted
 * (e.g. components rendered in isolation by unit tests). Production code always
 * runs under the provider; use this only where a sensible default is acceptable.
 */
export function useBusinessUnitOptional(): BusinessUnitContextValue | null {
  return useContext(BusinessUnitContext);
}

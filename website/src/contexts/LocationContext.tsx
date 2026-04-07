/**
 * LocationContext - Global location filter state shared across all pages
 * When user has a restricted location scope, auto-locks to their assigned locations.
 * @crossref:used-in[ALL_PAGES]
 * @crossref:provides[selectedLocationId, setSelectedLocationId, availableLocations, isSingleLocation]
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface LocationOption {
  id: string;
  name: string;
}

interface LocationContextValue {
  readonly selectedLocationId: string;
  readonly setSelectedLocationId: (id: string) => void;
  /** Locations the user is allowed to see (empty = show all from mock/DB) */
  readonly allowedLocations: LocationOption[];
  /** True when user is restricted to exactly one location */
  readonly isSingleLocation: boolean;
}

const LocationContext = createContext<LocationContextValue | null>(null);

interface LocationProviderProps {
  readonly children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const [selectedLocationId, setSelectedLocationId] = useState('all');
  const [allowedLocations, setAllowedLocations] = useState<LocationOption[]>([]);

  // Listen for auth changes via a custom event dispatched by AuthContext
  useEffect(() => {
    function handleAuthChange(e: Event) {
      const detail = (e as CustomEvent<{ locations: LocationOption[] } | null>).detail;
      if (!detail) {
        // logged out — reset
        setAllowedLocations([]);
        setSelectedLocationId('all');
        return;
      }

      const locs = detail.locations ?? [];
      setAllowedLocations(locs);

      if (locs.length === 1) {
        // Auto-select the single assigned location
        setSelectedLocationId(locs[0].id);
      } else if (locs.length > 1) {
        // Default to first assigned location
        setSelectedLocationId(locs[0].id);
      } else {
        // All-access — keep 'all'
        setSelectedLocationId('all');
      }
    }

    window.addEventListener('tdental:auth-change', handleAuthChange);
    return () => window.removeEventListener('tdental:auth-change', handleAuthChange);
  }, []);

  const isSingleLocation = allowedLocations.length === 1;

  return (
    <LocationContext.Provider
      value={{ selectedLocationId, setSelectedLocationId, allowedLocations, isSingleLocation }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationFilter(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useLocationFilter must be used within a LocationProvider');
  }
  return ctx;
}

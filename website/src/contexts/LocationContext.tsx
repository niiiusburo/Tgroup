/**
 * LocationContext - Global location filter state shared across all pages
 * @crossref:used-in[ALL_PAGES]
 * @crossref:provides[selectedLocationId, setSelectedLocationId]
 */

import { createContext, useContext, useState, type ReactNode } from 'react';

interface LocationContextValue {
  readonly selectedLocationId: string;
  readonly setSelectedLocationId: (id: string) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

interface LocationProviderProps {
  readonly children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const [selectedLocationId, setSelectedLocationId] = useState('all');

  return (
    <LocationContext.Provider value={{ selectedLocationId, setSelectedLocationId }}>
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

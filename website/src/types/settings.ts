/**
 * Settings-related type definitions
 * @crossref:used-in[Settings, ServiceCatalogSettings, RoleConfig, CustomerSourcesConfig, SystemPreferences]
 */

import type { AppointmentType } from '@/constants';

// System preference types
export type PreferenceType = 'string' | 'number' | 'boolean' | 'json' | 'toggle' | 'select' | 'text';

export interface SystemPreference {
  readonly id: string;
  readonly key: string;
  readonly value: string;
  readonly type: PreferenceType;
  readonly category: string;
  readonly description: string;
  readonly isPublic: boolean;
  // Extended fields for UI
  readonly label?: string;
  readonly options?: readonly { value: string; label: string }[];
}

// Service Catalog Settings
export interface CatalogService {
  readonly id: string;
  readonly name: string;
  readonly category: AppointmentType;
  readonly description: string;
  readonly price: number;
  readonly duration: number;
  readonly visits: number;
  readonly isActive: boolean;
}

// Customer Sources
export interface CustomerSource {
  readonly id: string;
  readonly name: string;
  readonly label?: string; // Extended field for dropdown
  readonly type: 'online' | 'offline' | 'referral';
  readonly description: string;
  readonly isActive: boolean;
  readonly customerCount: number;
}

// Default customer sources
export const DEFAULT_CUSTOMER_SOURCES: readonly CustomerSource[] = [
  { id: 'src-1', name: 'Sale Online', label: 'Sale Online', type: 'online', description: 'Kênh bán hàng trực tuyến', isActive: true, customerCount: 0 },
] as const;

/**
 * Settings types re-exported from /types/
 * @crossref:used-in[Settings, ServiceCatalogSettings, RoleConfig, CustomerSourcesConfig]
 */

import type { CatalogService, CustomerSource, SystemPreference } from '@/types/settings';

export type { CatalogService, CustomerSource, SystemPreference };

export const DEFAULT_CUSTOMER_SOURCES: readonly CustomerSource[] = [
  { id: 'src-1', name: 'Sale Online', type: 'online', description: 'Online sales', isActive: true, customerCount: 0 },
  { id: 'src-2', name: 'Facebook', type: 'online', description: 'Facebook ads', isActive: true, customerCount: 0 },
  { id: 'src-3', name: 'Google', type: 'online', description: 'Google ads', isActive: true, customerCount: 0 },
  { id: 'src-4', name: 'Referral', type: 'referral', description: 'Referral', isActive: true, customerCount: 0 },
  { id: 'src-5', name: 'Walk-in', type: 'offline', description: 'Walk-in', isActive: true, customerCount: 0 },
];

export const MOCK_CATALOG_SERVICES: CatalogService[] = [];
export const MOCK_CUSTOMER_SOURCES: CustomerSource[] = [];
export const MOCK_SYSTEM_PREFERENCES: SystemPreference[] = [];

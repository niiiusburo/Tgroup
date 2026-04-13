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

// ------------------------------------------------------------------
// Payment system preferences
// ------------------------------------------------------------------

/** System preferences that configure record-based payment behaviour. */
export const MOCK_PAYMENT_SYSTEM_PREFERENCES: readonly SystemPreference[] = [
  {
    id: 'pref-payment-methods',
    key: 'payment.record.methods',
    value: JSON.stringify(['cash', 'bank_transfer', 'deposit', 'mixed']),
    type: 'json',
    category: 'payment',
    description: 'Enabled payment methods for record-based payments',
    isPublic: true,
    label: 'Record Payment Methods',
  },
  {
    id: 'pref-payment-record-based',
    key: 'payment.record.enabled',
    value: 'true',
    type: 'toggle',
    category: 'payment',
    description: 'Enable record-based payment tracking per service record',
    isPublic: true,
    label: 'Record-Based Payments',
  },
  {
    id: 'pref-payment-allow-installment',
    key: 'payment.record.allowByDate',
    value: 'true',
    type: 'toggle',
    category: 'payment',
    description: 'Allow by-date (installment) payments on a single record',
    isPublic: true,
    label: 'Allow By-Date Payments',
  },
];

export const MOCK_SYSTEM_PREFERENCES: SystemPreference[] = [
  ...MOCK_PAYMENT_SYSTEM_PREFERENCES,
];

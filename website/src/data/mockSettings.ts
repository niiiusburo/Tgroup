/**
 * Settings types re-exported from /types/
 * @crossref:used-in[Settings, ServiceCatalogSettings, RoleConfig, CustomerSourcesConfig]
 */

import type { CatalogService, CustomerSource, SystemPreference } from '@/types/settings';

export type { CatalogService, CustomerSource, SystemPreference };

export const DEFAULT_CUSTOMER_SOURCES: readonly CustomerSource[] = [
  { id: 'src-1', name: 'Sale Online', type: 'online', description: 'Khách đến từ kênh sale online', isActive: true, customerCount: 0 },
  { id: 'src-2', name: 'Khách vãng lai', type: 'offline', description: 'Khách vãng lai', isActive: true, customerCount: 0 },
  { id: 'src-3', name: 'Hotline', type: 'online', description: 'Khách từ hotline', isActive: true, customerCount: 0 },
  { id: 'src-4', name: 'Khách cũ', type: 'referral', description: 'Khách cũ quay lại', isActive: true, customerCount: 0 },
  { id: 'src-5', name: 'Khách hàng giới thiệu', type: 'referral', description: 'Khách do khách hàng giới thiệu', isActive: true, customerCount: 0 },
  { id: 'src-6', name: 'Nội bộ giới thiệu', type: 'referral', description: 'Khách do nội bộ giới thiệu', isActive: true, customerCount: 0 },
  { id: 'src-7', name: 'MKT1', type: 'online', description: 'Kênh marketing 1', isActive: true, customerCount: 0 },
  { id: 'src-8', name: 'ĐNCB', type: 'offline', description: 'Đối tượng ngoài cơ sở bệnh', isActive: true, customerCount: 0 },
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

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
  { id: 'src-1', name: 'Sale Online', label: 'Sale Online', type: 'online', description: 'Khách đến từ kênh sale online', isActive: true, customerCount: 0 },
  { id: 'src-2', name: 'Khách vãng lai', label: 'Khách vãng lai', type: 'offline', description: 'Khách vãng lai', isActive: true, customerCount: 0 },
  { id: 'src-3', name: 'Hotline', label: 'Hotline', type: 'online', description: 'Khách từ hotline', isActive: true, customerCount: 0 },
  { id: 'src-4', name: 'Khách cũ', label: 'Khách cũ', type: 'referral', description: 'Khách cũ quay lại', isActive: true, customerCount: 0 },
  { id: 'src-5', name: 'Khách hàng giới thiệu', label: 'Khách hàng giới thiệu', type: 'referral', description: 'Khách do khách hàng giới thiệu', isActive: true, customerCount: 0 },
  { id: 'src-6', name: 'Nội bộ giới thiệu', label: 'Nội bộ giới thiệu', type: 'referral', description: 'Khách do nội bộ giới thiệu', isActive: true, customerCount: 0 },
  { id: 'src-7', name: 'MKT1', label: 'MKT1', type: 'online', description: 'Kênh marketing 1', isActive: true, customerCount: 0 },
  { id: 'src-8', name: 'ĐNCB', label: 'ĐNCB', type: 'offline', description: 'Đối tượng ngoài cơ sở bệnh', isActive: true, customerCount: 0 },
] as const;

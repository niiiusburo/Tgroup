import { apiFetch } from './core';

// ─── Customer Sources ─────────────────────────────────────────────

export interface ApiCustomerSource {
  id: string;
  name: string;
  type: 'online' | 'offline' | 'referral';
  description: string;
  is_active: boolean;
  customer_count: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerSourcesResponse {
  items: ApiCustomerSource[];
  aggregates: {
    total: number;
    active: number;
    totalCustomers: number;
    topSource: string;
  };
}

export function fetchCustomerSources(params?: {
  type?: string;
  is_active?: boolean;
  lob?: 'dental' | 'cosmetic';
}) {
  return apiFetch<CustomerSourcesResponse>('/CustomerSources', {
    lob: params?.lob,
    params: {
      type: params?.type,
      is_active: params?.is_active,
    },
  });
}

export function createCustomerSource(data: {
  name: string;
  type?: string;
  description?: string;
  is_active?: boolean;
}, lob?: 'dental' | 'cosmetic') {
  return apiFetch<ApiCustomerSource>('/CustomerSources', { method: 'POST', body: data, lob });
}

export function updateCustomerSource(id: string, data: Partial<{
  name: string;
  type: string;
  description: string;
  is_active: boolean;
}>, lob?: 'dental' | 'cosmetic') {
  return apiFetch<ApiCustomerSource>(`/CustomerSources/${id}`, { method: 'PUT', body: data, lob });
}

export function deleteCustomerSource(id: string, lob?: 'dental' | 'cosmetic') {
  return apiFetch<void>(`/CustomerSources/${id}`, { method: 'DELETE', lob });
}


/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[NK3 frontend API client: website/src/lib/api/companies]
 * @crossref:uses[product-map/domains/settings-system.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
import { apiFetch, type PaginatedResponse } from './core';

// ─── Companies (Locations) ────────────────────────────────────────

export interface ApiCompany {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  datecreated: string | null;
  lastupdated: string | null;
  address?: string | null;
  manager?: string | null;
  operatinghours?: string | null;
  taxcode?: string | null;
}

export interface CreateCompanyData {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  manager?: string;
  operatinghours?: string;
  taxcode?: string;
  active?: boolean;
}

export function fetchCompanies(params?: { offset?: number; limit?: number; lob?: 'dental' | 'cosmetic' }) {
  return apiFetch<PaginatedResponse<ApiCompany>>('/Companies', {
    params: { offset: params?.offset ?? 0, limit: params?.limit ?? 50 },
    lob: params?.lob,
  });
}

export function createCompany(data: CreateCompanyData, lob?: 'dental' | 'cosmetic') {
  return apiFetch<ApiCompany>('/Companies', { method: 'POST', body: data, lob });
}

export function updateCompany(id: string, data: Partial<CreateCompanyData>, lob?: 'dental' | 'cosmetic') {
  return apiFetch<ApiCompany>(`/Companies/${id}`, { method: 'PUT', body: data, lob });
}


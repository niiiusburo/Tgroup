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

export function fetchCompanies(params?: { offset?: number; limit?: number }) {
  return apiFetch<PaginatedResponse<ApiCompany>>('/Companies', {
    params: { offset: params?.offset ?? 0, limit: params?.limit ?? 50 },
  });
}

export function createCompany(data: CreateCompanyData) {
  return apiFetch<ApiCompany>('/Companies', { method: 'POST', body: data });
}

export function updateCompany(id: string, data: Partial<CreateCompanyData>) {
  return apiFetch<ApiCompany>(`/Companies/${id}`, { method: 'PUT', body: data });
}


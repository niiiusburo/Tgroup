import { apiFetch, type PaginatedResponse } from './core';

// ─── Employees ────────────────────────────────────────────────────

// Employee-specific creation uses Partners API with employee=true
export interface CreateEmployeeData {
  name: string;
  phone?: string;
  email?: string;
  password?: string;
  companyid?: string;
  isdoctor?: boolean;
  isassistant?: boolean;
  isreceptionist?: boolean;
  jobtitle?: string;
  active?: boolean;
  wage?: number;
  allowance?: number;
  startworkdate?: string;
  locationScopeIds?: string[];
  tierId?: string;
}

export function createEmployee(data: CreateEmployeeData) {
  return apiFetch<ApiEmployee>('/Employees', { method: 'POST', body: data });
}

export function updateEmployee(id: string, data: Partial<CreateEmployeeData>) {
  return apiFetch<ApiEmployee>(`/Employees/${id}`, { method: 'PUT', body: data });
}

export function deleteEmployee(id: string) {
  return apiFetch<void>(`/Employees/${id}`, { method: 'DELETE' });
}

export interface ApiEmployee {
  id: string;
  name: string;
  ref: string | null;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  isdoctor: boolean;
  isassistant: boolean;
  isreceptionist: boolean;
  active: boolean;
  companyid: string | null;
  companyname: string | null;
  locationScopeIds?: string[];
  hrjobid: string | null;
  hrjobname: string | null;
  tierId?: string | null;
  tierName?: string | null;
  jobtitle?: string | null;
  wage: string | null;
  allowance: string | null;
  startworkdate: string | null;
  datecreated: string | null;
  lastupdated: string | null;
}

export function fetchEmployees(params?: {
  offset?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  isDoctor?: boolean;
  isAssistant?: boolean;
  active?: 'true' | 'false' | 'all';
}) {
  return apiFetch<PaginatedResponse<ApiEmployee>>('/Employees', {
    params: {
      offset: params?.offset ?? 0,
      limit: params?.limit ?? 50,
      search: params?.search,
      companyId: params?.companyId,
      isDoctor: params?.isDoctor,
      isAssistant: params?.isAssistant,
      active: params?.active,
    },
  });
}


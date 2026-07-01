/**
 * @crossref:domain[employees-hr]
 * @crossref:used-in[Employees API client; website/src/lib/api.ts (barrel), website/src/hooks/useEmployees.ts, website/src/hooks/usePermissionBoard.ts, website/src/components/employees/EmployeeForm.tsx, website/src/pages/reports/ReportsRevenue.tsx]
 * @crossref:uses[website/src/lib/api/core.ts, api/src/routes/employees.js, api/src/routes/employees/mutations.js, product-map/domains/employees-hr.yaml]
 * Calls /api/Employees CRUD (LOB-aware).
 */
import { apiFetch, DEFAULT_PAGE_SIZE, type PaginatedResponse } from './core';

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

export function createEmployee(data: CreateEmployeeData, lob?: 'dental' | 'cosmetic') {
  return apiFetch<ApiEmployee>('/Employees', { method: 'POST', body: data, lob });
}

export function updateEmployee(id: string, data: Partial<CreateEmployeeData>, lob?: 'dental' | 'cosmetic') {
  return apiFetch<ApiEmployee>(`/Employees/${id}`, { method: 'PUT', body: data, lob });
}

export function deleteEmployee(id: string, lob?: 'dental' | 'cosmetic') {
  return apiFetch<void>(`/Employees/${id}`, { method: 'DELETE', lob });
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
  lob?: 'dental' | 'cosmetic';
}) {
  return apiFetch<PaginatedResponse<ApiEmployee>>('/Employees', {
    params: {
      offset: params?.offset ?? 0,
      limit: params?.limit ?? DEFAULT_PAGE_SIZE,
      search: params?.search,
      companyId: params?.companyId,
      isDoctor: params?.isDoctor,
      isAssistant: params?.isAssistant,
      active: params?.active,
    },
    lob: params?.lob,
  });
}

import { apiFetch, type PaginatedResponse } from './core';

// ─── Products (Services Catalog) ──────────────────────────────────

export interface ApiProduct {
  id: string;
  name: string;
  namenosign: string | null;
  defaultcode: string | null;
  type: string | null;
  type2: string | null;
  listprice: string | null;
  saleprice: string | null;
  purchaseprice: string | null;
  laboprice: string | null;
  categid: string | null;
  categname: string | null;
  categcompletename: string | null;
  uomid: string | null;
  uomname: string | null;
  companyid: string | null;
  companyname: string | null;
  canorderlab: boolean;
  active: boolean;
  datecreated: string | null;
  lastupdated: string | null;
}

export function fetchProducts(params?: {
  offset?: number;
  limit?: number;
  search?: string;
  categId?: string;
  companyId?: string;
  active?: 'true' | 'false' | 'all';
}) {
  return apiFetch<PaginatedResponse<ApiProduct>>('/Products', {
    params: {
      offset: params?.offset ?? 0,
      limit: params?.limit ?? 200,
      search: params?.search,
      categId: params?.categId,
      companyId: params?.companyId,
      active: params?.active,
    },
  });
}

export function createProduct(data: {
  name: string;
  defaultcode?: string;
  listprice?: number;
  categid?: string;
  uomname?: string;
  companyid?: string;
  canorderlab?: boolean;
}) {
  return apiFetch<ApiProduct>('/Products', { method: 'POST', body: data });
}

export function updateProduct(id: string, data: Partial<{
  name: string;
  defaultcode: string;
  listprice: number;
  categid: string;
  uomname: string;
  companyid: string;
  canorderlab: boolean;
  active: boolean;
}>) {
  return apiFetch<ApiProduct>(`/Products/${id}`, { method: 'PUT', body: data });
}

export function deleteProduct(id: string) {
  return apiFetch<void>(`/Products/${id}`, { method: 'DELETE' });
}

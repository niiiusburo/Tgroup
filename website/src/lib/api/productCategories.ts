import { apiFetch } from './core';

// ─── Product Categories ──────────────────────────────────────────

export interface ApiProductCategory {
  id: string;
  name: string;
  completename: string | null;
  parentid: string | null;
  active: boolean;
  product_count: number;
  datecreated: string | null;
  lastupdated: string | null;
}

export function fetchProductCategories(params?: { search?: string }) {
  return apiFetch<{ totalItems: number; items: ApiProductCategory[] }>('/ProductCategories', {
    params: { search: params?.search },
  });
}

export function createProductCategory(data: { name: string; parentid?: string }) {
  return apiFetch<ApiProductCategory>('/ProductCategories', { method: 'POST', body: data });
}

export function updateProductCategory(id: string, data: Partial<{ name: string; active: boolean }>) {
  return apiFetch<ApiProductCategory>(`/ProductCategories/${id}`, { method: 'PUT', body: data });
}

export function deleteProductCategory(id: string) {
  return apiFetch<void>(`/ProductCategories/${id}`, { method: 'DELETE' });
}


/**
 * @crossref:domain[services-catalog]
 * @crossref:used-in[NK3 frontend API client: website/src/lib/api/productCategories]
 * @crossref:uses[product-map/domains/services-catalog.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
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

export function fetchProductCategories(params?: { search?: string; lob?: 'dental' | 'cosmetic' }) {
  return apiFetch<{ totalItems: number; items: ApiProductCategory[] }>('/ProductCategories', {
    params: { search: params?.search },
    lob: params?.lob,
  });
}

export function createProductCategory(data: { name: string; parentid?: string }, lob?: 'dental' | 'cosmetic') {
  return apiFetch<ApiProductCategory>('/ProductCategories', { method: 'POST', body: data, lob });
}

export function updateProductCategory(id: string, data: Partial<{ name: string; active: boolean }>, lob?: 'dental' | 'cosmetic') {
  return apiFetch<ApiProductCategory>(`/ProductCategories/${id}`, { method: 'PUT', body: data, lob });
}

export function deleteProductCategory(id: string, lob?: 'dental' | 'cosmetic') {
  return apiFetch<void>(`/ProductCategories/${id}`, { method: 'DELETE', lob });
}


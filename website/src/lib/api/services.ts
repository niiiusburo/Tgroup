/**
 * @crossref:domain[services-catalog]
 * @crossref:used-in[DEAD CODE — no consumers; only re-exported by website/src/lib/api.ts (barrel)]
 * @crossref:uses[website/src/lib/api/core.ts, api/src/routes/services.js (unmounted in api/src/server.js), product-map/domains/services-catalog.yaml]
 * Calls /api/Services, whose route mount is commented out (non-existent public.services table).
 */
import { apiFetch } from './core';

// ─── Services (DEAD CODE — routes/services.js is unused) ──────────
// The frontend does NOT import fetchServices or createService.
// Service records use fetchSaleOrders/createSaleOrder above.
// Service catalog uses fetchProducts/createProduct above.
// These wrappers call /api/Services which queries a non-existent
// public.services table. Safe to delete.

export interface ApiService {
  id: string;
  customerId: string;
  doctorId?: string;
  serviceType: string;
  unitPrice: number;
  totalAmount: number;
  status: 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
}

export async function fetchServices(customerId?: string, lob?: 'dental' | 'cosmetic'): Promise<{ items: ApiService[]; totalItems: number }> {
  const url = customerId ? `/Services?customerId=${customerId}` : '/Services';
  return apiFetch<{ items: ApiService[]; totalItems: number }>(url, { lob });
}

export async function createService(data: {
  customerId: string;
  serviceType: string;
  unitPrice: number;
  quantity?: number;
  discount?: number;
  doctorId?: string;
  notes?: string;
  lob?: 'dental' | 'cosmetic';
}): Promise<ApiService> {
  return apiFetch<ApiService>('/Services', {
    method: 'POST',
    body: {
      customer_id: data.customerId,
      service_type: data.serviceType,
      unit_price: data.unitPrice,
      quantity: data.quantity || 1,
      discount: data.discount || 0,
      doctor_id: data.doctorId,
      notes: data.notes,
    },
    lob: data.lob,
  });
}


/**
 * ctv.ts — API client for CTV dashboard (v2)
 * Calls /api/ctv/* (self-gated)
 */
import { apiFetch } from './core';

export interface CtvCommissionSummary {
  totals: {
    pending: number;
    paid: number;
    dentalPending: number;
    cosmeticPending: number;
  };
  counts: { pending: number; paid: number };
  recent: Array<{
    id: string;
    client_name: string;
    amount: number;
    source: string;
    lob: 'dental' | 'cosmetic';
    earned_at: string;
    status: string;
  }>;
  pendingList?: any[];
  paidList?: any[];
}

export interface CtvReferral {
  id: string;
  name: string;
  phone?: string;
  lobs: string[];
  total_earned: number;
  earned_count: number;
  status: 'earning' | 'no visit yet';
  referred_at?: string;
}

export async function fetchCtvSummary(): Promise<CtvCommissionSummary> {
  return apiFetch<CtvCommissionSummary>('/ctv/commission-summary');
}

export async function fetchCtvReferrals(): Promise<{ referrals: CtvReferral[] }> {
  return apiFetch('/ctv/referrals');
}

export async function fetchCtvMe(): Promise<{ id: string; name: string; email?: string; phone?: string; role: string }> {
  return apiFetch('/ctv/me');
}

export interface CreateCtvInput {
  name: string;
  phone: string;
  email: string;
  password: string;
  lob_scope?: string[];
  referred_by_ctv_id?: string;
}

export interface CtvRecord {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  lob_scope?: string[];
  active?: boolean;
  is_ctv?: boolean;
  referred_by_ctv_id?: string | null;
  upline_name?: string | null;
}

export interface ReferClientInput {
  name: string;
  phone: string;
  lob: 'dental' | 'cosmetic';
}

/** Create a CTV (caller must be a CTV or admin). New CTV is active immediately. */
export async function createCtv(input: CreateCtvInput): Promise<CtvRecord> {
  return apiFetch<CtvRecord>('/ctv', { method: 'POST', body: input });
}

/** Refer a new client (customer) under the calling CTV. */
export async function referClient(input: ReferClientInput): Promise<CtvRecord> {
  return apiFetch<CtvRecord>('/ctv/clients', { method: 'POST', body: input });
}

/** Admin: list CTVs, optionally filtered by status. */
export async function fetchCtvs(status?: 'active' | 'suspended'): Promise<{ ctvs: CtvRecord[] }> {
  return apiFetch('/Ctvs', { params: status ? { status } : undefined });
}

/** Admin: suspend or reactivate a CTV. */
export async function setCtvActive(id: string, active: boolean): Promise<CtvRecord> {
  return apiFetch<CtvRecord>(`/Ctvs/${id}`, { method: 'PATCH', body: { active } });
}

export interface CreateBookingInput {
  clientId?: string;
  name?: string;
  phone: string;
  lob: 'dental' | 'cosmetic';
  date: string;
  time?: string;
  companyId?: string;
  productId?: string;
}

/** Create a booking for a referred client (or new client). May fail with B_CLIENT_CLAIMED if client is under another CTV. */
export async function createBooking(input: CreateBookingInput): Promise<{ clientId: string; appointmentId: string }> {
  return apiFetch<{ clientId: string; appointmentId: string }>('/ctv/bookings', { method: 'POST', body: input });
}

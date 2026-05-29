/**
 * ctv.ts — API client for CTV dashboard (v2.1)
 * Calls /api/ctv/* (self-gated)
 */
import { apiFetch } from './core';

export interface CtvPayoutCycle {
  id: string;
  lob: 'dental' | 'cosmetic';
  cycle_label: string;
  paid_at?: string;
  total_amount: number;
  receipt_url?: string | null;
}

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
    client_name: string | null;
    amount: number;
    source: string;
    lob: 'dental' | 'cosmetic';
    earned_at: string;
    status: string;
  }>;
  pendingList?: any[];
  paidList?: any[];
  payouts?: CtvPayoutCycle[];
}

export interface CtvReferral {
  id: string;
  name: string | null;
  phone?: string;
  lobs: string[];
  total_earned: number;
  earned_count: number;
  status: 'earning' | 'no visit yet';
  referred_at?: string;
}

/** Extended referral with client journey tracking stages */
export interface CtvClientJourney {
  id: string;
  name: string | null;
  phone?: string;
  lobs: string[];
  referred_at: string;
  referred_via?: string;
  stage: 'referred' | 'visited' | 'serviced' | 'paid';
  stage_progress: number; // 1-4
  visit?: {
    date: string;
    time?: string;
    doctor?: string;
    location?: string;
  };
  service?: {
    name: string | null;
    amount: number;
    date?: string;
    next_appointment?: string;
  };
  payment?: {
    amount: number;
    date: string;
    method?: string;
    commission_earned: number;
    commission_rate?: string;
  };
  total_earned: number;
  estimated_commission?: number;
}

export interface CtvNetworkNode {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  active?: boolean;
  lobs?: string[];
  level?: number;
  referred_by_ctv_id?: string | null;
  client_count?: number;
  active_earnings_sum?: number;
  children?: CtvNetworkNode[];
}

export interface CtvNetworkResponse {
  self: CtvNetworkNode;
  upline: CtvNetworkNode | null;
  direct: CtvNetworkNode[];
  downline: CtvNetworkNode[];
}

export async function fetchCtvSummary(): Promise<CtvCommissionSummary> {
  return apiFetch<CtvCommissionSummary>('/ctv/commission-summary');
}

export async function fetchCtvReferrals(): Promise<{ referrals: CtvReferral[] }> {
  return apiFetch('/ctv/referrals');
}

export async function fetchCtvClientJourneys(): Promise<{ clients: CtvClientJourney[] }> {
  return apiFetch('/ctv/client-journeys');
}

export async function fetchCtvNetwork(): Promise<CtvNetworkResponse> {
  return apiFetch<CtvNetworkResponse>('/ctv/network');
}

export async function fetchCtvMe(): Promise<{ id: string; name: string; email?: string; phone?: string; role: string; referral_code?: string }> {
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
  legacy_code?: string | null;
  created_via?: string | null;
  source?: string | null;
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
export async function fetchCtvs(
  status?: 'active' | 'suspended',
  lob?: 'dental' | 'cosmetic'
): Promise<{ ctvs: CtvRecord[] }> {
  return apiFetch('/Ctvs', {
    lob: lob === 'cosmetic' ? 'cosmetic' : undefined,
    params: status ? { status } : undefined,
  });
}

export interface UpdateCtvInput {
  name?: string;
  phone?: string;
  email?: string;
  /** When provided and non-empty, resets the CTV's login password. */
  password?: string;
}

/** Admin: edit a CTV's profile fields (name, phone, email, password). */
export async function updateCtv(
  id: string,
  input: UpdateCtvInput,
  lob?: 'dental' | 'cosmetic'
): Promise<CtvRecord> {
  return apiFetch<CtvRecord>(`/Ctvs/${id}`, {
    method: 'PUT',
    lob: lob === 'cosmetic' ? 'cosmetic' : undefined,
    body: input,
  });
}

/** Admin: suspend or reactivate a CTV. */
export async function setCtvActive(
  id: string,
  active: boolean,
  lob?: 'dental' | 'cosmetic'
): Promise<CtvRecord> {
  return apiFetch<CtvRecord>(`/Ctvs/${id}`, {
    method: 'PATCH',
    lob: lob === 'cosmetic' ? 'cosmetic' : undefined,
    body: { active },
  });
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

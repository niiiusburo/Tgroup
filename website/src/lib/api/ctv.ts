/**
 * ctv.ts — API client for CTV dashboard (unified Stack A + B + hierarchy)
 * Calls /api/ctv/* (self-gated; backend uses requireAuth + requireCtvUser).
 */
import { apiFetch } from './core';

export type CtvLob = 'dental' | 'cosmetic';
export type CtvServiceStatus = 'pending' | 'paid' | 'reversed' | string;

export interface CtvReferralService {
  readonly id: string;
  readonly serviceLineId: string | null;
  readonly paymentId: string | null;
  readonly serviceName: string;
  readonly amount: number;
  readonly status: CtvServiceStatus;
  readonly source: string;
  readonly lob: CtvLob;
  readonly earnedAt: string | null;
}

export interface CtvPayoutCycle {
  id: string;
  lob: CtvLob;
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
    client_id?: string;
    client_name: string;
    service_line_id?: string | null;
    service_name?: string;
    payment_id?: string | null;
    amount: number;
    source: string;
    lob: CtvLob;
    earned_at: string | null;
    status: CtvServiceStatus;
  }>;
  pendingList?: any[];
  paidList?: any[];
  payouts?: CtvPayoutCycle[];
  tierLabels?: Record<number, string>;
}

export interface CtvReferral {
  id: string;
  name: string;
  phone?: string;
  lobs: CtvLob[];
  total_earned: number;
  earned_count: number;
  service_count?: number;
  status: 'earning' | 'no visit yet' | string;
  referred_at?: string | null;
  services?: CtvReferralService[];
}

export interface CtvReferralResponse {
  referrals: CtvReferral[];
}

/** Extended referral with client journey tracking stages */
export interface CtvClientJourney {
  id: string;
  name: string;
  phone?: string;
  lobs: CtvLob[];
  referred_at: string;
  referred_via?: string;
  stage: 'referred' | 'visited' | 'serviced' | 'paid';
  stage_progress: number;
  visit?: { date: string; time?: string; doctor?: string; location?: string };
  service?: { name: string; amount: number; date?: string; next_appointment?: string };
  payment?: {
    amount: number;
    date: string;
    method?: string;
    commission_earned: number;
    commission_rate?: string;
  };
  total_earned: number;
  estimated_commission?: number;
  services?: CtvReferralService[];
}

export interface CtvNetworkNode {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  active?: boolean;
  lobs?: CtvLob[];
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

/** Hierarchy tree node (from Stack C hierarchy tab) */
export interface CtvHierarchyNode {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  level?: number;
  lobs: CtvLob[];
  joinedAt?: string | null;
  directDownlineCount?: number;
  referred_by_ctv_id?: string | null;
  children?: CtvHierarchyNode[];
}

export interface CtvHierarchyTotals {
  directDownlineCount: number;
  downlineCount: number;
  uplineCount: number;
}

export interface CtvHierarchyResponse {
  current: CtvHierarchyNode;
  upline: CtvHierarchyNode[];
  downline: CtvHierarchyNode[];
  totals: CtvHierarchyTotals;
}

export async function fetchCtvSummary(): Promise<CtvCommissionSummary> {
  return apiFetch<CtvCommissionSummary>('/ctv/commission-summary');
}

/** Alias retained for Stack B callers */
export const fetchCtvCommissionSummary = fetchCtvSummary;

export async function fetchCtvReferrals(): Promise<CtvReferralResponse> {
  return apiFetch('/ctv/referrals');
}

export async function fetchCtvClientJourneys(): Promise<{ clients: CtvClientJourney[] }> {
  return apiFetch('/ctv/client-journeys');
}

export async function fetchCtvNetwork(): Promise<CtvNetworkResponse> {
  return apiFetch<CtvNetworkResponse>('/ctv/network');
}

export async function fetchCtvHierarchy(): Promise<CtvHierarchyResponse> {
  return apiFetch<CtvHierarchyResponse>('/ctv/hierarchy');
}

export async function fetchCtvMe(): Promise<{
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  referral_code?: string;
}> {
  return apiFetch('/ctv/me');
}

export interface CtvProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  lob_scope?: CtvLob[];
  is_ctv?: boolean;
}

export async function fetchCtvProfile(): Promise<CtvProfile> {
  return apiFetch<CtvProfile>('/ctv/me');
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
  name?: string;
  phone?: string;
  lob: 'dental' | 'cosmetic';
  // Alternate Stack B / modal-shape fields (backend tolerates either)
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  serviceInterest?: string;
  notes?: string;
}

/** Create a CTV (caller must be a CTV or admin). New CTV is active immediately. */
export async function createCtv(input: CreateCtvInput): Promise<CtvRecord> {
  return apiFetch<CtvRecord>('/ctv', { method: 'POST', body: input });
}

/**
 * Refer a new client under the calling CTV.
 * Endpoint: POST /api/ctv/referrals (unified — checks dental+cosmetic for phone,
 * creates partner + first consultation appointment in chosen LOB if not already present).
 */
export async function referClient(input: ReferClientInput): Promise<CtvRecord> {
  return apiFetch<CtvRecord>('/ctv/referrals', { method: 'POST', body: input });
}

/** Alias retained for Stack B callers — same as referClient. */
export interface CreateReferralPayload extends ReferClientInput {}
export interface CreateReferralResponse extends CtvRecord {}
export const createCtvReferral = referClient;

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

/** Create a booking for a referred client. */
export async function createBooking(input: CreateBookingInput): Promise<{ clientId: string; appointmentId: string }> {
  return apiFetch<{ clientId: string; appointmentId: string }>('/ctv/bookings', { method: 'POST', body: input });
}

export interface CtvCommissionRow {
  level: number;
  rate: number;
  label?: string;
  is_active?: boolean;
}

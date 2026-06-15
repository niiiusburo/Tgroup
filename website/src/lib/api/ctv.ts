/**
 * @crossref:domain[ctv]
 * @crossref:used-in[CTV portal+admin API client; website/src/hooks/useCtvs.ts, website/src/components/commission/CtvManagementTab.tsx, website/src/components/shared/CtvSelector.tsx, website/src/pages/CTV/JoinCtv.tsx, website/src/components/ctv/CtvReferModal.tsx, website/src/components/ctv/CtvHierarchyPanel.tsx]
 * @crossref:uses[website/src/lib/api/core.ts, website/src/lib/pii.ts, api/src/routes/ctv.js, api/src/routes/ctvs.js, api/src/routes/ctvPublic.js, product-map/domains/ctv.yaml]
 * Calls /api/ctv/* (portal), /api/Ctvs/* (admin), /api/ctv-public/* (no-auth join/booking).
 */
import { apiFetch } from './core';
import { maskPhone, maskEmail } from '@/lib/pii';

export type CtvLob = 'dental' | 'cosmetic';
export type CtvServiceStatus = 'pending' | 'paid' | 'reversed' | string;
export type CtvJourneyStage = 'referred' | 'visited' | 'serviced' | 'paid';

export interface CtvReferralLobLink {
  readonly lob: CtvLob;
  readonly link_expires_at?: string | null;
  readonly link_anchor_at?: string | null;
  readonly link_active?: boolean;
  readonly eligible?: boolean;
  readonly linked_ctv_id?: string | null;
  readonly linked_ctv_name?: string | null;
  readonly stage?: CtvJourneyStage;
  readonly stage_progress?: 1 | 2 | 3 | 4;
}

export interface CtvReferralService {
  readonly id: string;
  readonly serviceLineId: string | null;
  readonly paymentId: string | null;
  readonly serviceName: string | null;
  readonly amount: number;
  readonly status: CtvServiceStatus;
  readonly source: string;
  readonly lob: CtvLob;
  readonly earnedAt: string | null;
}

export interface CtvReferral {
  readonly id: string;
  readonly name: string | null;
  readonly phone: string;
  readonly lobs: CtvLob[];
  readonly total_earned: number;
  readonly earned_count: number;
  readonly service_count: number;
  readonly status: 'earning' | 'no visit yet' | 'paid' | string;
  readonly referred_at: string | null;
  readonly services: CtvReferralService[];
  // Activity-based journey (from /ctv/referrals): reflects the client's real progress
  // (visited/serviced/paid) independent of commission payout. Optional for back-compat.
  readonly stage?: CtvJourneyStage;
  readonly stage_progress?: 1 | 2 | 3 | 4;
  readonly last_payment_at?: string | null;
  readonly last_visit_at?: string | null;
  // 6-month CTV-link eligibility window (from /ctv/referrals). Optional for back-compat.
  readonly link_expires_at?: string | null;
  readonly link_anchor_at?: string | null;
  readonly link_active?: boolean;
  readonly eligible?: boolean;
  readonly linked_ctv_id?: string | null;
  readonly linked_ctv_name?: string | null;
  /** card = client on Theo dõi via appointments.ctv_id and/or saleorders.ctv_id (not profile). */
  readonly tracking_source?: 'card';
  /** Per-LOB 6-month claim windows; dental and cosmetic are independent. */
  readonly lob_links?: Partial<Record<CtvLob, CtvReferralLobLink>>;
  readonly last_commission_at?: string | null;
}

export interface CtvReferralResponse {
  readonly referrals: CtvReferral[];
}

export interface CtvHierarchyNode {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly joinedAt: string | null;
  readonly referredByCtvId: string | null;
  readonly level: number;
  readonly directDownlineCount: number;
  readonly lobs: CtvLob[];
  /** This member's own total earnings (downline nodes only). */
  readonly earned?: number;
  /** This member's contribution to the current CTV's projected override (downline nodes only). */
  readonly overrideContribution?: number;
}

export interface CtvHierarchyResponse {
  readonly current: CtvHierarchyNode;
  readonly upline: CtvHierarchyNode[];
  readonly downline: CtvHierarchyNode[];
  readonly totals: {
    readonly uplineCount: number;
    readonly downlineCount: number;
    readonly directDownlineCount: number;
    /** Σ of the whole downline's own earnings (their direct commissions). */
    readonly downlineEarningsBase?: number;
    /** Projected override this CTV could earn from the downline (base × level share %). */
    readonly potentialOverride?: number;
    /** Effective "% you earn from your downline" (blended), or the L1 rate when base is 0. */
    readonly overrideRatePct?: number;
  };
}

export type CtvCommissionAttributionKind = 'own_referral' | 'service_attached' | 'downline_override';

export interface CtvCommissionRow {
  readonly id: string;
  readonly client_id?: string;
  readonly client_name: string | null;
  readonly service_line_id?: string | null;
  readonly service_name?: string | null;
  readonly payment_id?: string | null;
  readonly amount: number;
  readonly source: string;
  readonly lob: CtvLob;
  readonly earned_at: string | null;
  readonly status: CtvServiceStatus;
  /** MLM level on this earnings row (0 = direct on service card, 1+ = upline override). */
  readonly level?: number;
  readonly attribution_kind?: CtvCommissionAttributionKind;
  readonly override_level?: number;
  /** Level-0 CTV attached to the service (downline when viewer earns override). */
  readonly attributed_ctv_id?: string | null;
  readonly attributed_ctv_name?: string | null;
  readonly client_referred_by_me?: boolean;
}

export interface CtvCommissionSummary {
  readonly totals: {
    readonly pending: number;
    readonly paid: number;
    readonly dentalPending: number;
    readonly cosmeticPending: number;
  };
  readonly counts: {
    readonly pending: number;
    readonly paid: number;
  };
  readonly recent: CtvCommissionRow[];
  readonly pendingList: CtvCommissionRow[];
  readonly paidList: CtvCommissionRow[];
}

export function fetchCtvReferrals() {
  return apiFetch<CtvReferralResponse>('/ctv/referrals');
}

function maskHierarchyNode(n: CtvHierarchyNode): CtvHierarchyNode {
  if (!n) return n;
  return { ...n, phone: maskPhone(n.phone), email: maskEmail(n.email) };
}

export async function fetchCtvHierarchy(): Promise<CtvHierarchyResponse> {
  const res = await apiFetch<CtvHierarchyResponse>('/ctv/hierarchy');
  // Mask PII (phone/email) of every CTV in the tree before it reaches the UI.
  return {
    ...res,
    current: maskHierarchyNode(res.current),
    upline: (res.upline ?? []).map(maskHierarchyNode),
    downline: (res.downline ?? []).map(maskHierarchyNode),
  };
}

export function fetchCtvCommissionSummary() {
  return apiFetch<CtvCommissionSummary>('/ctv/commission-summary');
}

// ─── Admin CTV management + CTV selector options (nk3) ────────────────────────
// Preserved from the nk3-deploy lineage so CtvManagementTab (admin) and the
// service/appointment CTV selector (useCtvs) keep working alongside the portal API.
export interface CreateCtvInput {
  name: string;
  phone: string;
  email?: string;
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
  is_live?: boolean;
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

/** Lightweight CTV option for the service/appointment CTV selector. */
export interface CtvOption {
  id: string;
  name: string;
  phone?: string | null;
  lob_scope?: string[] | null;
}

/**
 * List active CTVs for the CTV selector (service/appointment forms).
 * Available to any authenticated staff (not admin-gated). LOB-filtered so the
 * cosmetic LOB only offers cosmetic-scoped CTVs.
 */
export async function fetchCtvOptions(
  lob?: 'dental' | 'cosmetic'
): Promise<{ ctvs: CtvOption[] }> {
  return apiFetch('/Ctvs/options', {
    lob: lob === 'cosmetic' ? 'cosmetic' : undefined,
    params: lob ? { lob } : undefined,
  });
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
  /** lob_scope to assign to this CTV (e.g. ['dental'], ['dental','cosmetic']). 'dental' is always forced by backend for auth. */
  lob_scope?: string[];
  /** Admin toggle for CTV LIVE/OFF QR discount tier. */
  is_live?: boolean;
}

/** Admin: edit a CTV's profile fields (name, phone, email, password) and/or lob_scope. */
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

/**
 * Admin: fetch the upline + downline hierarchy for an arbitrary CTV.
 * Same response shape as the CTV self-portal hierarchy; spans both LOB DBs.
 */
export async function fetchCtvHierarchyForCtv(
  id: string,
  lob?: 'dental' | 'cosmetic'
): Promise<CtvHierarchyResponse> {
  return apiFetch<CtvHierarchyResponse>(`/Ctvs/${id}/hierarchy`, {
    lob: lob === 'cosmetic' ? 'cosmetic' : undefined,
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
  /** Service (product) to attach to the created appointment card. */
  productId?: string;
  /** Free-text note to attach to the created appointment card. */
  note?: string;
}

export interface CreatePublicBookingInput extends CreateBookingInput {
  /** Public landing flow identifier for the CTV who should own the referral. */
  ctvPhone: string;
}

/** Create a booking for a referred client (or new client). May fail with B_CLIENT_CLAIMED if client is under another CTV. */
export async function createBooking(input: CreateBookingInput): Promise<{ clientId: string; appointmentId: string }> {
  return apiFetch<{ clientId: string; appointmentId: string }>('/ctv/bookings', { method: 'POST', body: input });
}

/** Public no-login booking from the landing page; resolves the CTV by phone server-side. */
export async function createPublicBooking(input: CreatePublicBookingInput): Promise<{ clientId: string; appointmentId: string }> {
  return apiFetch<{ clientId: string; appointmentId: string }>('/ctv-public/bookings', { method: 'POST', body: input });
}

/** A selectable service (product) for the CTV refer form, scoped to one LOB. */
export interface CtvServiceCategory {
  readonly id: string;
  readonly name: string | null;
}

export interface CtvServiceOption {
  readonly id: string;
  readonly name: string;
  readonly price: number | null;
  /** Catalog category for grouping the picker. `null` for uncategorized services. */
  readonly category?: CtvServiceCategory | null;
}

// ─── Public CTV self-signup via referral link (no auth) ───────────────────────
export interface CtvRefCodeInfo {
  readonly ok: boolean;
  readonly uplineId?: string;
  readonly uplineName?: string | null;
}

export interface PublicCtvLookup {
  readonly exists: boolean;
  readonly name?: string | null;
}

/** Resolve a referral code (CTV-XXXXXX) to its upline. PUBLIC — no auth required. */
export async function resolveCtvRefCode(code: string): Promise<CtvRefCodeInfo> {
  return apiFetch<CtvRefCodeInfo>(`/ctv-public/refcode/${encodeURIComponent(code)}`);
}

/** Verify a public CTV phone field while typing. PUBLIC — no auth required. */
export async function lookupPublicCtvByPhone(phone: string): Promise<PublicCtvLookup> {
  const qs = `?phone=${encodeURIComponent(phone)}`;
  return apiFetch<PublicCtvLookup>(`/ctv-public/ctv-lookup${qs}`);
}

export interface CtvJoinInput {
  readonly code?: string;
  /** Public no-link signup field: phone for the CTV this new CTV should sit under. */
  readonly uplinePhone?: string;
  readonly name: string;
  readonly phone: string;
  readonly email?: string;
  readonly password: string;
}

/** Self-register as a CTV under a referral code or upline CTV phone. PUBLIC — no auth required. */
export async function joinCtv(
  input: CtvJoinInput
): Promise<{ ok: boolean; id: string; name: string; uplineName?: string | null }> {
  return apiFetch('/ctv-public/join', { method: 'POST', body: input });
}

/**
 * Fetch the active service catalog for the chosen LOB, for the refer form's
 * service picker. CTV-scoped endpoint (does not require the admin `services.view`
 * permission). `lob` is passed as an explicit query param — the CTV picks LOB
 * per-referral, so this is NOT routed through the `/cosmetic` apiFetch mirror.
 */
export async function fetchCtvServices(lob: CtvLob): Promise<{ services: CtvServiceOption[] }> {
  const qs = `?lob=${encodeURIComponent(lob === 'cosmetic' ? 'cosmetic' : 'dental')}`;
  return apiFetch<{ services: CtvServiceOption[] }>(`/ctv/services${qs}`);
}

/** Public service catalog for the landing booking sheet. */
export async function fetchPublicCtvServices(lob: CtvLob): Promise<{ services: CtvServiceOption[] }> {
  const qs = `?lob=${encodeURIComponent(lob === 'cosmetic' ? 'cosmetic' : 'dental')}`;
  return apiFetch<{ services: CtvServiceOption[] }>(`/ctv-public/services${qs}`);
}

export interface CtvClientLookup {
  readonly exists: boolean;
  readonly lob: CtvLob;
  readonly clientId?: string;
  readonly name?: string | null;
  readonly claimed?: boolean;
  readonly claimedByMe?: boolean;
  readonly ownerName?: string | null;
  readonly expiresAt?: string | null;
}

/** Live phone cross-check: does this phone already exist in the CHOSEN LOB's DB, and is it claimed? */
export async function lookupClientByPhone(phone: string, lob: CtvLob): Promise<CtvClientLookup> {
  const qs = `?phone=${encodeURIComponent(phone)}&lob=${encodeURIComponent(lob)}`;
  return apiFetch<CtvClientLookup>(`/ctv/client-lookup${qs}`);
}

/** Public phone cross-check for the landing booking sheet. */
export async function lookupPublicClientByPhone(phone: string, lob: CtvLob, ctvPhone?: string): Promise<CtvClientLookup> {
  const params = new URLSearchParams({
    phone,
    lob,
  });
  if (ctvPhone) params.set('ctvPhone', ctvPhone);
  return apiFetch<CtvClientLookup>(`/ctv-public/client-lookup?${params.toString()}`);
}

/**
 * §12 admin hierarchy move: re-parent a CTV under a new upline (or null = root).
 * Backend enforces the fresh-CTV no-activity guard (409 B_CTV_HAS_ACTIVITY) + writes an audit log.
 */
export async function moveCtv(id: string, uplineId: string | null): Promise<{ ok: boolean; id: string; oldUpline: string | null; newUpline: string | null }> {
  return apiFetch(`/Ctvs/${id}/move`, { method: 'POST', body: { uplineId } });
}

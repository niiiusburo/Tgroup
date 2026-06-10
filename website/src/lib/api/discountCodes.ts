/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[NK3 frontend API client: website/src/lib/api/discountCodes]
 * @crossref:uses[product-map/domains/settings-system.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
import { apiFetch, API_URL } from './core';

export type DiscountCodeLob = 'dental' | 'cosmetic';

export interface DiscountCodeLookup {
  found: boolean;
  valid?: boolean;
  code: string;
  status?: string;
  discountValue?: number;
  discountType?: 'percent' | 'fixed';
  discountLabel?: string;
  ctvName?: string | null;
  ctvPhone?: string | null;
  expiresAt?: string | null;
  message?: string;
  usedAt?: string | null;
  usedByStaffName?: string | null;
}

export interface DiscountClientLookup {
  exists: boolean;
  lob: DiscountCodeLob;
  clientId?: string;
  name?: string | null;
  phone?: string | null;
  claimed?: boolean;
  claimedByMe?: boolean;
  ownerName?: string | null;
  expiresAt?: string | null;
  hasService?: boolean;
}

export interface DiscountVerifyResult {
  valid: boolean;
  code: string;
  status?: string;
  discountLabel?: string;
  ctvName?: string;
  customerName?: string;
  customerLob?: DiscountCodeLob;
  message?: string;
  usedAt?: string;
}

export interface DiscountCodeEnsure {
  code: string;
  discountValue: number;
  discountType: 'percent' | 'fixed';
  status: string;
  expiresAt?: string | null;
}

export interface DiscountCodeGenerate {
  success: boolean;
  code: string;
  isExisting: boolean;
  discountValue: number;
  discountType: 'percent' | 'fixed';
  discountLabel?: string;
  expiresAt?: string | null;
  ctvName?: string;
  shortCode?: string;
  message?: string;
}

export interface CtvDiscountLandingInfo {
  success: boolean;
  ctv: {
    id: string;
    name: string;
    shortCode: string;
    isLive: boolean;
    discountValue: number;
    discountType: 'percent' | 'fixed';
    expiryDays: number;
  };
}

export interface CtvDiscountCodeRow {
  id: string;
  code: string;
  status: string;
  visitorName: string | null;
  visitorPhone: string | null;
  discountValue: number;
  discountType: 'percent' | 'fixed';
  discountLabel: string;
  generatedAt: string;
  claimedAt: string | null;
  usedAt: string | null;
  expiresAt: string | null;
  checkedInAt?: string | null;
  customerLob?: string | null;
  usedByStaffName?: string | null;
  ctvName?: string | null;
  ctvPhone?: string | null;
  paymentId?: string | null;
}

export interface CtvDiscountCodesList {
  success: boolean;
  codes: CtvDiscountCodeRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CtvDiscountCodeStats {
  success: boolean;
  stats: {
    totalCodes: number;
    usedCodes: number;
    claimedCodes: number;
    checkedInCodes: number;
    conversionRate: string;
  };
}

export async function lookupDiscountCode(code: string): Promise<DiscountCodeLookup> {
  const qs = new URLSearchParams({ code });
  return apiFetch<DiscountCodeLookup>(`/discount-codes/lookup?${qs.toString()}`);
}

export async function lookupDiscountClient(
  phone: string,
  lob: DiscountCodeLob,
  code: string
): Promise<DiscountClientLookup> {
  const qs = new URLSearchParams({ phone, lob, code });
  return apiFetch<DiscountClientLookup>(`/discount-codes/client-search?${qs.toString()}`);
}

export async function verifyDiscountCode(input: {
  code: string;
  customerPartnerId?: string;
  customerLob: DiscountCodeLob;
  customerPhone: string;
  customerName?: string;
  createIfMissing?: boolean;
  markAsUsed?: boolean;
}): Promise<DiscountVerifyResult> {
  return apiFetch<DiscountVerifyResult>('/discount-codes/verify', {
    method: 'POST',
    body: input,
  });
}

export async function ensureCtvDiscountCode(): Promise<DiscountCodeEnsure> {
  return apiFetch<DiscountCodeEnsure>('/discount-codes/ensure', { method: 'POST', body: {} });
}

export async function generateCtvDiscountCode(input?: {
  ctvId?: string;
  visitorName?: string;
  visitorPhone?: string;
  forceNew?: boolean;
}): Promise<DiscountCodeGenerate> {
  return apiFetch<DiscountCodeGenerate>('/discount-codes/generate', {
    method: 'POST',
    body: input || {},
  });
}

export async function fetchCtvDiscountLanding(shortCode: string): Promise<CtvDiscountLandingInfo> {
  const res = await fetch(`${API_URL}/discount-codes/landing/${encodeURIComponent(shortCode)}`);
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || !contentType.includes('application/json')) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message || 'Landing not found'
    );
  }
  return res.json() as Promise<CtvDiscountLandingInfo>;
}

export async function checkExistingFanCode(ctvId: string): Promise<DiscountCodeGenerate & { hasCode: boolean }> {
  const qs = new URLSearchParams({ ctvId });
  const res = await fetch(`${API_URL}/discount-codes/check-existing?${qs.toString()}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Could not check existing code');
  return res.json() as Promise<DiscountCodeGenerate & { hasCode: boolean }>;
}

export async function generateFanDiscountCode(ctvId: string): Promise<DiscountCodeGenerate> {
  const res = await fetch(`${API_URL}/discount-codes/generate`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ctvId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Generate failed');
  }
  return res.json() as Promise<DiscountCodeGenerate>;
}

export async function fetchMyDiscountCodes(params?: {
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<CtvDiscountCodesList> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.startDate) qs.set('startDate', params.startDate);
  if (params?.endDate) qs.set('endDate', params.endDate);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<CtvDiscountCodesList>(`/discount-codes/mine${suffix}`);
}

export async function fetchMyDiscountCodeStats(): Promise<CtvDiscountCodeStats> {
  return apiFetch<CtvDiscountCodeStats>('/discount-codes/stats');
}

export async function fetchAdminDiscountCodes(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<CtvDiscountCodesList> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.search) qs.set('search', params.search);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return apiFetch<CtvDiscountCodesList>(`/discount-codes/admin${query ? `?${query}` : ''}`);
}

export function buildStaffVerifyDiscountUrl(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const qs = new URLSearchParams({ code });
  return `${origin}/verify-discount?${qs.toString()}`;
}
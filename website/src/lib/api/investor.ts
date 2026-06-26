/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[InvestorAuthContext, InvestorDashboard]
 * @crossref:uses[api/src/routes/investor/*, product-map/domains/investor-portal.yaml]
 */
import { ApiError } from './core';
import { API_URL } from './apiBaseUrl';
import { clearInvestorToken, getInvestorToken } from '@/lib/investorToken';

export const INVESTOR_UNAUTHORIZED_EVENT = 'tgclinic:investor-unauthorized';

export interface InvestorProfile {
  id: string;
  email: string;
  investor_name: string | null;
  lob: 'dental' | 'cosmetic';
}

export interface InvestorClient {
  id: string;
  name: string;
  gender?: string | null;
  birth_year?: number | null;
  appointment_count: number;
  order_count: number;
  deposit_balance: number;
  outstanding_balance: number;
  status: 'active' | 'inactive';
}

export interface InvestorLoginResponse {
  success: true;
  token: string;
  investor: InvestorProfile;
  permissions: string[];
}

export interface InvestorClientsResponse {
  success: true;
  offset: number;
  limit: number;
  totalItems: number;
  items: InvestorClient[];
}

async function investorFetch<T>(endpoint: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const { method = 'GET', body } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getInvestorToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearInvestorToken();
      window.dispatchEvent(new CustomEvent(INVESTOR_UNAUTHORIZED_EVENT));
    }
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      throw new ApiError({ status: res.status, message: `Request failed (${res.status})` });
    }
    const p = parsed as Record<string, unknown>;
    throw new ApiError({
      status: res.status,
      code: typeof p.code === 'string' ? p.code : undefined,
      message: typeof p.error === 'string' ? p.error : `Request failed (${res.status})`,
      body: parsed,
    });
  }

  return res.json() as Promise<T>;
}

export function investorLogin(email: string, password: string) {
  return investorFetch<InvestorLoginResponse>('/investor/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function fetchInvestorMe() {
  return investorFetch<{ success: true; investor: InvestorProfile; permissions: string[] }>('/investor/auth/me');
}

export function fetchInvestorClients(params?: { offset?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.offset !== undefined) qs.set('offset', String(params.offset));
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return investorFetch<InvestorClientsResponse>(`/investor/clients${query ? `?${query}` : ''}`);
}

export function requestInvestorPasswordReset(email: string) {
  return investorFetch<{ success: true; message: string; token?: string; resetUrl?: string }>(
    '/investor/auth/password-reset-request',
    { method: 'POST', body: { email } },
  );
}

export function confirmInvestorPasswordReset(token: string, password: string, confirmPassword: string) {
  return investorFetch<{ success: true }>('/investor/auth/password-reset', {
    method: 'POST',
    body: { token, password, confirmPassword },
  });
}
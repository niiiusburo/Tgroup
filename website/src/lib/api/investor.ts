/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[InvestorAuthContext, InvestorDashboard]
 * @crossref:uses[api/src/routes/investor/*, product-map/domains/investor-portal.yaml]
 */
import { apiFetch, type AuthTokenSource } from './core';
import { clearInvestorToken, getInvestorToken } from '@/lib/investorToken';

export const INVESTOR_UNAUTHORIZED_EVENT = 'tgclinic:investor-unauthorized';

/** Investor-portal auth token source — reuses apiFetch with investor token storage. */
const investorAuthTokenSource: AuthTokenSource = {
  getToken: getInvestorToken,
  onUnauthorized: () => {
    clearInvestorToken();
    window.dispatchEvent(new CustomEvent(INVESTOR_UNAUTHORIZED_EVENT));
  },
};

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

export interface InvestorPortfolioOverview {
  client_count: number;
  appointment_count: number;
  active_days: number;
  order_count: number;
  service_total: number;
  paid_total: number;
  collected_total: number;
  outstanding_in_range: number;
  deposit_total: number;
  outstanding_total: number;
}

export interface InvestorPortfolioAppointment {
  id: string;
  client_id: string;
  client_name: string;
  date: string;
  time?: string | null;
  status?: string | null;
  service_name?: string | null;
  doctor_name?: string | null;
  location_name?: string | null;
}

export interface InvestorPortfolioDailyRow {
  date: string;
  appointment_count: number;
  order_count: number;
  service_total: number;
  paid_total: number;
  collected_total: number;
  outstanding_total: number;
}

export interface InvestorPortfolioCustomerRow {
  client_id: string;
  client_name: string;
  appointment_count: number;
  order_count: number;
  service_total: number;
  paid_total: number;
  outstanding_total: number;
}

export interface InvestorPortfolioStatusRow {
  status: string;
  appointment_count: number;
}

export interface InvestorPortfolioBreakdownRow {
  id?: string | null;
  label: string;
  appointment_count: number;
  order_count: number;
  service_total: number;
}

export interface InvestorPortfolioResponse {
  success: true;
  dateFrom: string;
  dateTo: string;
  overview: InvestorPortfolioOverview;
  clients: InvestorClient[];
  calendar: {
    items: InvestorPortfolioAppointment[];
    totalItems: number;
  };
  reports: {
    daily: InvestorPortfolioDailyRow[];
    byCustomer: InvestorPortfolioCustomerRow[];
    appointmentStatus: InvestorPortfolioStatusRow[];
    byDoctor: InvestorPortfolioBreakdownRow[];
    byLocation: InvestorPortfolioBreakdownRow[];
    byService: InvestorPortfolioBreakdownRow[];
  };
  extraction: {
    generatedAt: string;
    rowCount: number;
  };
}

export function investorLogin(email: string, password: string) {
  return apiFetch<InvestorLoginResponse>('/investor/auth/login', {
    method: 'POST',
    body: { email, password },
    authTokenSource: investorAuthTokenSource,
  });
}

export function fetchInvestorMe() {
  return apiFetch<{ success: true; investor: InvestorProfile; permissions: string[] }>('/investor/auth/me', {
    authTokenSource: investorAuthTokenSource,
  });
}

export function fetchInvestorClients(params?: { offset?: number; limit?: number }) {
  return apiFetch<InvestorClientsResponse>('/investor/clients', {
    params: {
      offset: params?.offset,
      limit: params?.limit,
    },
    authTokenSource: investorAuthTokenSource,
  });
}

export function fetchInvestorPortfolio(params: { dateFrom: string; dateTo: string }) {
  return apiFetch<InvestorPortfolioResponse>('/investor/portfolio', {
    params: {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    },
    authTokenSource: investorAuthTokenSource,
  });
}

export function requestInvestorPasswordReset(email: string) {
  return apiFetch<{ success: true; message: string; token?: string; resetUrl?: string }>(
    '/investor/auth/password-reset-request',
    {
      method: 'POST',
      body: { email },
      authTokenSource: investorAuthTokenSource,
    },
  );
}

export function confirmInvestorPasswordReset(token: string, password: string, confirmPassword: string) {
  return apiFetch<{ success: true }>('/investor/auth/password-reset', {
    method: 'POST',
    body: { token, password, confirmPassword },
    authTokenSource: investorAuthTokenSource,
  });
}

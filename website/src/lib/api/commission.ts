/**
 * commission.ts — API client for commission configuration (admin)
 * Calls /api/CommissionConfig
 */
import { apiFetch } from './core';

export interface CommissionLevel {
  level: number;
  label: string;
  enabled: boolean;
  share_percent: number;
}

export interface CommissionConfig {
  levels: CommissionLevel[];
}

export async function fetchCommissionConfig(lob?: 'dental' | 'cosmetic'): Promise<CommissionConfig> {
  return apiFetch<CommissionConfig>('/CommissionConfig', { lob });
}

export async function saveCommissionConfig(cfg: CommissionConfig, lob?: 'dental' | 'cosmetic'): Promise<CommissionConfig> {
  return apiFetch<CommissionConfig>('/CommissionConfig', { method: 'PUT', body: cfg, lob });
}

export interface EarningsRow {
  id: string;
  lob: 'dental' | 'cosmetic';
  client_id?: string;
  client_name?: string;
  recipient_partner_id: string;
  recipient_name?: string;
  product_id?: string;
  product_name?: string;
  source?: string;
  level?: number;
  amount: number;
  status: 'pending' | 'paid' | 'reversed' | string;
  payout_id?: string | null;
  earned_at?: string;
  created_at?: string;
}

export interface EarningsResponse {
  items: EarningsRow[];
  totalItems: number;
  totals: { amount: number; byLob: Record<string, number> };
  limit: number;
  offset: number;
}

export interface PayoutRow {
  id: string;
  lob: 'dental' | 'cosmetic';
  cycle_label: string;
  paid_at?: string;
  total_amount: number;
  notes?: string | null;
  receipt_url?: string | null;
  receipt_uploaded_at?: string | null;
  created_by_partner_id?: string | null;
  created_by_name?: string | null;
  earnings_count: number;
  created_at?: string;
  // §10: set when this payout is one leg of a combined Dental+Cosmetic payout.
  payout_group_id?: string | null;
}

export interface PayoutsResponse {
  items: PayoutRow[];
  totalItems: number;
  limit: number;
  offset: number;
}

export interface NewClientRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  referred_at?: string;
  referring_ctv_id?: string;
  referring_ctv_name: string;
  referring_ctv_phone: string;
  lob: 'dental' | 'cosmetic';
}

export interface NewClientsResponse {
  items: NewClientRow[];
  totalItems: number;
  limit: number;
  offset: number;
}

export async function fetchNewClients(params: Record<string, string | number | undefined> = {}): Promise<NewClientsResponse> {
  return apiFetch<NewClientsResponse>('/NewClients', { params });
}

export async function fetchEarnings(params: Record<string, string | number | undefined> = {}): Promise<EarningsResponse> {
  return apiFetch<EarningsResponse>('/Earnings', { params });
}

export async function fetchPayouts(params: Record<string, string | number | undefined> = {}): Promise<PayoutsResponse> {
  return apiFetch<PayoutsResponse>('/Payouts', { params });
}

export async function createPayout(input: {
  lob: 'dental' | 'cosmetic';
  earningIds: string[];
  cycleLabel: string;
  notes?: string;
  receipt_url?: string;
}): Promise<PayoutRow> {
  return apiFetch<PayoutRow>('/Payouts', { method: 'POST', body: input });
}

export async function uploadPayoutReceipt(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('receipt', file);
  return apiFetch<{ url: string }>('/Payouts/upload-receipt', {
    method: 'POST',
    body: formData,
  });
}

export async function updatePayoutReceipt(payoutId: string, receiptUrl: string, lob?: 'dental' | 'cosmetic'): Promise<PayoutRow> {
  return apiFetch<PayoutRow>(`/Payouts/${payoutId}`, {
    method: 'PATCH',
    body: { receipt_url: receiptUrl, lob },
  });
}

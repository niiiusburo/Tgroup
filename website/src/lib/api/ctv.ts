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

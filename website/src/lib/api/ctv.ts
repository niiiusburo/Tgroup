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

export interface CtvReferral {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly lobs: CtvLob[];
  readonly total_earned: number;
  readonly earned_count: number;
  readonly service_count: number;
  readonly status: 'earning' | 'no visit yet' | string;
  readonly referred_at: string | null;
  readonly services: CtvReferralService[];
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
}

export interface CtvHierarchyResponse {
  readonly current: CtvHierarchyNode;
  readonly upline: CtvHierarchyNode[];
  readonly downline: CtvHierarchyNode[];
  readonly totals: {
    readonly uplineCount: number;
    readonly downlineCount: number;
    readonly directDownlineCount: number;
  };
}

export interface CtvCommissionRow {
  readonly id: string;
  readonly client_id?: string;
  readonly client_name: string;
  readonly service_line_id?: string | null;
  readonly service_name?: string;
  readonly payment_id?: string | null;
  readonly amount: number;
  readonly source: string;
  readonly lob: CtvLob;
  readonly earned_at: string | null;
  readonly status: CtvServiceStatus;
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

export interface CtvProfile {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly role: string;
}

export function fetchCtvReferrals() {
  return apiFetch<CtvReferralResponse>('/ctv/referrals');
}

export function fetchCtvHierarchy() {
  return apiFetch<CtvHierarchyResponse>('/ctv/hierarchy');
}

export function fetchCtvCommissionSummary() {
  return apiFetch<CtvCommissionSummary>('/ctv/commission-summary');
}

export function fetchCtvProfile() {
  return apiFetch<CtvProfile>('/ctv/me');
}

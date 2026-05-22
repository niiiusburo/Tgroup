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
  defaultReferralPercent: number;
}

export async function fetchCommissionConfig(): Promise<CommissionConfig> {
  return apiFetch<CommissionConfig>('/CommissionConfig');
}

export async function saveCommissionConfig(cfg: CommissionConfig): Promise<CommissionConfig> {
  return apiFetch<CommissionConfig>('/CommissionConfig', { method: 'PUT', body: cfg });
}

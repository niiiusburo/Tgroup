import { apiFetch } from './core';

export type CommissionTierLob = 'dental' | 'cosmetic';

export interface CommissionTier {
  readonly lob: CommissionTierLob;
  readonly level: number;
  readonly rate: number;
  readonly label: string;
  readonly isActive: boolean;
  readonly updatedAt: string;
}

export interface CommissionTierResponse {
  readonly lob: CommissionTierLob;
  readonly tiers: CommissionTier[];
}

export function fetchCommissionTiers(lob: CommissionTierLob) {
  return apiFetch<CommissionTierResponse>(`/admin/commission-tiers?lob=${lob}`);
}

export function updateCommissionTiers(lob: CommissionTierLob, tiers: CommissionTier[]) {
  return apiFetch<CommissionTierResponse>('/admin/commission-tiers', {
    method: 'PUT',
    body: { lob, tiers },
  });
}

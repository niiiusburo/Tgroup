/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[Customers investor visibility column]
 * @crossref:uses[/api/investor-visibility, PATCH /api/Partners/:id/investor-visibility]
 */
import { apiFetch } from './core';

export interface InvestorVisibilityState {
  investorId: string;
  investorName: string;
  isVisible: boolean;
  isActive?: boolean;
}

export function fetchInvestorVisibilityBatch(partnerIds: string[], lob: 'dental' | 'cosmetic') {
  if (partnerIds.length === 0) {
    return Promise.resolve({ success: true as const, batch: {} as Record<string, InvestorVisibilityState[]> });
  }
  return apiFetch<{ success: true; batch: Record<string, InvestorVisibilityState[]> }>('/investor-visibility', {
    params: { partnerIds: partnerIds.join(','), lob },
  });
}

export function patchPartnerInvestorVisibility(
  partnerId: string,
  investorId: string,
  isVisible: boolean,
  lob: 'dental' | 'cosmetic',
) {
  return apiFetch<{
    success: true;
    investorId: string;
    partnerId: string;
    isVisible: boolean;
    investorName: string;
  }>(`/Partners/${partnerId}/investor-visibility`, {
    method: 'PATCH',
    body: { investorId, isVisible },
    lob,
  });
}
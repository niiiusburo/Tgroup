/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[InvestorManagement settings tab]
 * @crossref:uses[/api/admin/investors, product-map/domains/investor-portal.yaml]
 */
import { apiFetch } from './core';

export interface InvestorAdminItem {
  id: string;
  email: string;
  investor_name: string | null;
  lob: 'dental' | 'cosmetic';
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  client_count?: number;
}

export interface CreateInvestorInput {
  email: string;
  investorName: string;
  lob: 'dental' | 'cosmetic';
  password?: string;
}

export function fetchAdminInvestors(lob: 'dental' | 'cosmetic') {
  return apiFetch<{ success: true; items: InvestorAdminItem[]; lob: string }>('/admin/investors', {
    params: { lob },
  });
}

export function createAdminInvestor(input: CreateInvestorInput) {
  return apiFetch<{
    success: true;
    investor: InvestorAdminItem;
    initialPassword?: string;
  }>('/admin/investors', {
    method: 'POST',
    body: input,
  });
}

export function updateAdminInvestor(
  id: string,
  body: { investorName?: string; isActive?: boolean },
  lob: 'dental' | 'cosmetic',
) {
  return apiFetch<{ success: true; investor: InvestorAdminItem }>(`/admin/investors/${id}`, {
    method: 'PATCH',
    body,
    params: { lob },
  });
}
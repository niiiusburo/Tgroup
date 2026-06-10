/**
 * @crossref:domain[customers-partners]
 * @crossref:used-in[Customer balance API client; website/src/lib/api.ts (barrel), website/src/hooks/useCustomerProfile.ts, website/src/hooks/useDeposits.ts]
 * @crossref:uses[website/src/lib/api/core.ts, api/src/routes/customerBalance.js, product-map/domains/customers-partners.yaml]
 * Calls /api/CustomerBalance/:customerId; maps snake_case response to camelCase.
 */
import { apiFetch } from './core';

// ─── Customer Balance ─────────────────────────────────────────────

export interface ApiCustomerBalance {
  id: string;
  name: string;
  depositBalance: number;
  outstandingBalance: number;
  totalDeposited: number;
  totalUsed: number;
  totalRefunded: number;
}

export async function fetchCustomerBalance(customerId: string, lob?: 'dental' | 'cosmetic'): Promise<ApiCustomerBalance> {
  const res = await apiFetch<{ deposit_balance: number; outstanding_balance: number; total_deposited?: number; total_used?: number; total_refunded?: number }>(`/CustomerBalance/${customerId}`, { lob });
  return {
    id: customerId,
    name: '',
    depositBalance: Number(res.deposit_balance) || 0,
    outstandingBalance: Number(res.outstanding_balance) || 0,
    totalDeposited: Number(res.total_deposited) || 0,
    totalUsed: Number(res.total_used) || 0,
    totalRefunded: Number(res.total_refunded) || 0,
  };
}


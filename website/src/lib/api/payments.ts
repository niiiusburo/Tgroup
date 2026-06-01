import { apiFetch } from './core';

// ─── Payments ────────────────────────────────────────────────────

export interface ApiPaymentAllocation {
  id: string;
  invoiceId?: string;
  dotkhamId?: string;
  invoiceName?: string;
  invoiceCode?: string;
  dotkhamName?: string;
  invoiceTotal?: number;
  dotkhamTotal?: number;
  invoiceResidual?: number;
  dotkhamResidual?: number;
  allocatedAmount: number;
}

export interface ApiPayment {
  id: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  serviceId?: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'deposit' | 'mixed';
  depositUsed?: number;
  cashAmount?: number;
  bankAmount?: number;
  receiptNumber?: string;
  depositType?: 'deposit' | 'refund' | 'usage' | null;
  paymentCategory?: 'payment' | 'deposit';
  locationName?: string;
  notes?: string;
  paymentDate?: string;
  referenceCode?: string;
  status?: 'posted' | 'voided';
  createdAt: string;
  allocations?: ApiPaymentAllocation[];
}

export async function fetchPayments(
  customerId?: string,
  type?: 'payments' | 'deposits' | 'all',
  search?: string,
  lob?: 'dental' | 'cosmetic',
): Promise<{ items: ApiPayment[]; totalItems: number }> {
  const searchParams = new URLSearchParams();
  if (customerId) searchParams.set('customerId', customerId);
  if (type && type !== 'all') searchParams.set('type', type);
  if (search?.trim()) searchParams.set('search', search.trim());
  searchParams.set('limit', '100');
  searchParams.set('offset', '0');
  return apiFetch<{ items: ApiPayment[]; totalItems: number }>(`/Payments?${searchParams.toString()}`, { lob });
}

export async function createPayment(data: {
  customerId: string;
  serviceId?: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'deposit' | 'mixed';
  notes?: string;
  paymentDate?: string;
  referenceCode?: string;
  status?: 'posted' | 'voided';
  depositUsed?: number;
  cashAmount?: number;
  bankAmount?: number;
  depositType?: 'deposit' | 'refund' | 'usage';
  allocations?: { invoice_id?: string; dotkham_id?: string; allocated_amount: number }[];
}, lob?: 'dental' | 'cosmetic'): Promise<ApiPayment> {
  return apiFetch<ApiPayment>('/Payments', {
    method: 'POST',
    lob,
    body: {
      customer_id: data.customerId,
      service_id: data.serviceId,
      amount: data.amount,
      method: data.method,
      notes: data.notes,
      payment_date: data.paymentDate,
      reference_code: data.referenceCode,
      status: data.status ?? 'posted',
      deposit_used: data.depositUsed ?? 0,
      cash_amount: data.cashAmount ?? 0,
      bank_amount: data.bankAmount ?? 0,
      deposit_type: data.depositType,
      allocations: data.allocations,
    },
  });
}

export async function voidPayment(id: string, reason?: string, lob?: 'dental' | 'cosmetic'): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/Payments/${id}/void`, {
    method: 'POST',
    lob,
    body: { reason },
  });
}

export async function fetchDeposits(params: {
  customerId: string;
  dateFrom?: string;
  dateTo?: string;
  receiptNumber?: string;
  type?: 'deposit' | 'refund' | 'all';
  limit?: number;
  offset?: number;
  lob?: 'dental' | 'cosmetic';
}): Promise<{ items: ApiPayment[]; totalItems: number }> {
  const searchParams = new URLSearchParams();
  searchParams.set('customerId', params.customerId);
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params.dateTo) searchParams.set('dateTo', params.dateTo);
  if (params.receiptNumber) searchParams.set('receiptNumber', params.receiptNumber);
  if (params.type) searchParams.set('type', params.type);
  searchParams.set('limit', String(params.limit ?? 100));
  searchParams.set('offset', String(params.offset ?? 0));
  return apiFetch<{ items: ApiPayment[]; totalItems: number }>(`/Payments/deposits?${searchParams.toString()}`, { lob: params.lob });
}

export async function fetchDepositUsage(params: {
  customerId: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  lob?: 'dental' | 'cosmetic';
}): Promise<{ items: ApiPayment[]; totalItems: number }> {
  const searchParams = new URLSearchParams();
  searchParams.set('customerId', params.customerId);
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params.dateTo) searchParams.set('dateTo', params.dateTo);
  searchParams.set('limit', String(params.limit ?? 100));
  searchParams.set('offset', String(params.offset ?? 0));
  return apiFetch<{ items: ApiPayment[]; totalItems: number }>(`/Payments/deposit-usage?${searchParams.toString()}`, { lob: params.lob });
}

export async function createRefund(data: {
  customerId: string;
  amount: number;
  method: 'cash' | 'bank_transfer';
  notes?: string;
  paymentDate?: string;
}, lob?: 'dental' | 'cosmetic'): Promise<ApiPayment> {
  return apiFetch<ApiPayment>('/Payments/refund', {
    method: 'POST',
    lob,
    body: {
      customer_id: data.customerId,
      amount: data.amount,
      method: data.method,
      notes: data.notes,
      payment_date: data.paymentDate,
    },
  });
}

export async function updatePayment(
  id: string,
  data: Partial<{
    amount: number;
    method: 'cash' | 'bank_transfer' | 'deposit' | 'mixed';
    notes: string;
    paymentDate: string;
    referenceCode: string;
    status: 'posted' | 'voided';
  }>,
  lob?: 'dental' | 'cosmetic'
): Promise<ApiPayment> {
  return apiFetch<ApiPayment>(`/Payments/${id}`, {
    method: 'PATCH',
    lob,
    body: {
      amount: data.amount,
      method: data.method,
      notes: data.notes,
      payment_date: data.paymentDate,
      reference_code: data.referenceCode,
      status: data.status,
    },
  });
}

/**
 * Delete a payment. `hard` (default) permanently removes the payment + its still-pending
 * commission; `hard:false` soft-deletes (marks 'deleted', reverses earnings, keeps the row
 * for audit). Either way the API returns 409 (B_COMMISSION_PAID_OUT) if the commission was
 * already paid out — refund instead.
 */
export async function deletePayment(
  id: string,
  lob?: 'dental' | 'cosmetic',
  opts: { hard?: boolean } = {}
): Promise<{ success: boolean; mode?: 'hard' | 'soft' }> {
  const hard = opts.hard !== false; // default hard so the payment actually disappears
  return apiFetch<{ success: boolean; mode?: 'hard' | 'soft' }>(`/Payments/${id}?hard=${hard}`, { method: 'DELETE', lob });
}

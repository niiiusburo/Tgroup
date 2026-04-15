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
  serviceId?: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'deposit' | 'mixed';
  depositUsed?: number;
  cashAmount?: number;
  bankAmount?: number;
  receiptNumber?: string;
  depositType?: 'deposit' | 'refund' | 'usage' | null;
  notes?: string;
  paymentDate?: string;
  referenceCode?: string;
  status?: 'posted' | 'voided';
  createdAt: string;
  allocations?: ApiPaymentAllocation[];
}

export async function fetchPayments(
  customerId?: string,
  type?: 'payments' | 'deposits' | 'all'
): Promise<{ items: ApiPayment[]; totalItems: number }> {
  const searchParams = new URLSearchParams();
  if (customerId) searchParams.set('customerId', customerId);
  if (type && type !== 'all') searchParams.set('type', type);
  searchParams.set('limit', '100');
  searchParams.set('offset', '0');
  return apiFetch<{ items: ApiPayment[]; totalItems: number }>(`/Payments?${searchParams.toString()}`);
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
}): Promise<ApiPayment> {
  return apiFetch<ApiPayment>('/Payments', {
    method: 'POST',
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

export async function voidPayment(id: string, reason?: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/Payments/${id}/void`, {
    method: 'POST',
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
}): Promise<{ items: ApiPayment[]; totalItems: number }> {
  const searchParams = new URLSearchParams();
  searchParams.set('customerId', params.customerId);
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params.dateTo) searchParams.set('dateTo', params.dateTo);
  if (params.receiptNumber) searchParams.set('receiptNumber', params.receiptNumber);
  if (params.type) searchParams.set('type', params.type);
  searchParams.set('limit', String(params.limit ?? 100));
  searchParams.set('offset', String(params.offset ?? 0));
  return apiFetch<{ items: ApiPayment[]; totalItems: number }>(`/Payments/deposits?${searchParams.toString()}`);
}

export async function fetchDepositUsage(params: {
  customerId: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: ApiPayment[]; totalItems: number }> {
  const searchParams = new URLSearchParams();
  searchParams.set('customerId', params.customerId);
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params.dateTo) searchParams.set('dateTo', params.dateTo);
  searchParams.set('limit', String(params.limit ?? 100));
  searchParams.set('offset', String(params.offset ?? 0));
  return apiFetch<{ items: ApiPayment[]; totalItems: number }>(`/Payments/deposit-usage?${searchParams.toString()}`);
}

export async function createRefund(data: {
  customerId: string;
  amount: number;
  method: 'cash' | 'bank_transfer';
  notes?: string;
  paymentDate?: string;
}): Promise<ApiPayment> {
  return apiFetch<ApiPayment>('/Payments/refund', {
    method: 'POST',
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
  }>
): Promise<ApiPayment> {
  return apiFetch<ApiPayment>(`/Payments/${id}`, {
    method: 'PATCH',
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

export async function deletePayment(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/Payments/${id}`, { method: 'DELETE' });
}


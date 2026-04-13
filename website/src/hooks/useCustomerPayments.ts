import { useState, useEffect, useCallback } from 'react';
import { fetchPayments, createPayment, voidPayment, type ApiPayment, type ApiPaymentAllocation } from '@/lib/api';

export interface PaymentWithAllocations extends ApiPayment {
  allocations: ApiPaymentAllocation[];
}

export interface UseCustomerPaymentsResult {
  payments: PaymentWithAllocations[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  addPayment: (data: {
    customerId: string;
    amount: number;
    method: 'cash' | 'bank_transfer' | 'deposit' | 'mixed';
    notes?: string;
    paymentDate?: string;
    referenceCode?: string;
    depositUsed?: number;
    cashAmount?: number;
    bankAmount?: number;
    allocations?: { invoice_id?: string; dotkham_id?: string; allocated_amount: number }[];
  }) => Promise<ApiPayment>;
  voidPaymentById: (id: string, reason?: string) => Promise<void>;
}

export function useCustomerPayments(customerId: string | null): UseCustomerPaymentsResult {
  const [payments, setPayments] = useState<PaymentWithAllocations[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!customerId) {
      setPayments([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchPayments(customerId, 'payments');
      setPayments(res.items as PaymentWithAllocations[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  const addPayment = useCallback(async (data: Parameters<UseCustomerPaymentsResult['addPayment']>[0]) => {
    const created = await createPayment({
      customerId: data.customerId,
      amount: data.amount,
      method: data.method,
      notes: data.notes,
      paymentDate: data.paymentDate,
      referenceCode: data.referenceCode,
      depositUsed: data.depositUsed,
      cashAmount: data.cashAmount,
      bankAmount: data.bankAmount,
      allocations: data.allocations,
    });
    setPayments((prev) => [created as PaymentWithAllocations, ...prev]);
    return created;
  }, []);

  const voidPaymentById = useCallback(async (id: string, reason?: string) => {
    await voidPayment(id, reason);
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'voided' as const, allocations: [] } : p))
    );
  }, []);

  return {
    payments,
    isLoading,
    error,
    refetch: load,
    addPayment,
    voidPaymentById,
  };
}

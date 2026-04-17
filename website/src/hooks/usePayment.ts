/**
 * usePayment - Payment operations, wallet management, and outstanding balances
 * @crossref:used-in[Payment, Services, Customers]
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fetchSaleOrders, type ApiSaleOrder } from '@/lib/api';
import { createPayment } from '@/lib/api/payments';
import {
  type PaymentRecord,
  type PaymentMethod,
  type PaymentStatus,
  type DepositWalletData,
  type OutstandingBalanceItem,
  type RecordPaymentTracker,
  type RecordType,
} from '@/data/mockPayment';

export type PaymentFilter = 'all' | PaymentStatus;

export interface CreatePaymentInput {
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly recordId?: string;
  readonly recordType?: RecordType;
  readonly recordName?: string;
  readonly amount: number;
  readonly method: PaymentMethod;
  readonly locationName: string;
  readonly notes: string;
}

export interface TopUpInput {
  readonly customerId: string;
  readonly amount: number;
  readonly method: 'cash' | 'bank_transfer' | 'vietqr';
  readonly date?: string;
  readonly note?: string;
}

/**
 * Map ApiSaleOrder to PaymentRecord
 */
function mapSaleOrderToPayment(saleOrder: ApiSaleOrder): PaymentRecord {
  const residual = parseFloat(saleOrder.residual ?? '0');
  const status: PaymentStatus = residual === 0 ? 'completed' : 'pending';

  return {
    id: saleOrder.id,
    customerId: saleOrder.partnerid ?? '',
    customerName: saleOrder.partnername ?? '',
    customerPhone: '',
    recordId: saleOrder.id,
    recordType: 'saleorder',
    recordName: saleOrder.code || saleOrder.name || '',
    amount: parseFloat(saleOrder.amounttotal ?? '0') || 0,
    method: 'bank_transfer' as const,
    status,
    date: saleOrder.datecreated?.slice(0, 10) ?? '',
    locationName: saleOrder.companyname ?? '',
    notes: saleOrder.state ?? '',
    receiptNumber: saleOrder.name ?? '',
    isFullPayment: residual === 0,
  };
}

/**
 * Derive OutstandingBalanceItem from sale orders where residual > 0
 */
function mapSaleOrderToOutstandingBalance(saleOrder: ApiSaleOrder): OutstandingBalanceItem | null {
  const residual = parseFloat(saleOrder.residual ?? '0');
  if (residual <= 0) return null;

  return {
    id: saleOrder.id,
    customerId: saleOrder.partnerid ?? '',
    customerName: saleOrder.partnername ?? '',
    customerPhone: '',
    recordType: 'saleorder',
    recordName: saleOrder.code || saleOrder.name || '',
    totalCost: parseFloat(saleOrder.amounttotal ?? '0') || 0,
    paidAmount: parseFloat(saleOrder.totalpaid ?? '0') || 0,
    remainingBalance: residual,
    dueDate: '',
    locationName: saleOrder.companyname ?? '',
  };
}

export function usePayment(selectedLocationId?: string) {
  const [payments, setPayments] = useState<readonly PaymentRecord[]>([]);
  const [outstandingBalances, setOutstandingBalances] = useState<readonly OutstandingBalanceItem[]>([]);
  const [wallets] = useState<readonly DepositWalletData[]>([]);
  const [statusFilter, setStatusFilter] = useState<PaymentFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Fetch sale orders from API
   */
  const fetchPayments = useCallback(async (search?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchSaleOrders({
        offset: 0,
        limit: 100, // Accommodate all 76 records
        search: search || undefined,
        companyId: selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : undefined,
      });

      const paymentRecords = response.items.map(mapSaleOrderToPayment);
      const outstanding = response.items
        .map(mapSaleOrderToOutstandingBalance)
        .filter((item): item is OutstandingBalanceItem => item !== null);

      setPayments(paymentRecords);
      setOutstandingBalances(outstanding);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payments');
      console.error('Payment fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLocationId]);

  /**
   * Refetch data
   */
  const refetch = useCallback(() => {
    fetchPayments(searchTerm || undefined);
  }, [fetchPayments, searchTerm]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  /**
   * Debounced search
   */
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (searchTerm) {
        fetchPayments(searchTerm);
      } else {
        fetchPayments();
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, fetchPayments]);

  const filteredPayments = useMemo(() => {
    let result: readonly PaymentRecord[] = payments;

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    return [...result].sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, statusFilter]);

  const stats = useMemo(() => {
    const completed = payments.filter((p) => p.status === 'completed');
    const totalRevenue = completed.reduce((sum, p) => sum + p.amount, 0);
    const totalOutstanding = outstandingBalances.reduce((sum, b) => sum + b.remainingBalance, 0);

    return {
      totalPayments: payments.length,
      completedPayments: completed.length,
      totalRevenue,
      totalOutstanding,
      totalWalletBalance: 0,
      activeWallets: 0,
    };
  }, [payments, outstandingBalances]);

  const createPayment = useCallback((input: CreatePaymentInput) => {
    const newPayment: PaymentRecord = {
      ...input,
      id: `pay-${Date.now()}`,
      recordId: input.recordId ?? '',
      recordType: input.recordType ?? 'saleorder',
      recordName: input.recordName ?? '',
      status: 'completed',
      date: new Date().toISOString().slice(0, 10),
      receiptNumber: `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      isFullPayment: true,
    };

    setPayments((prev) => [newPayment, ...prev]);
    return newPayment;
  }, []);

  const topUpWallet = useCallback(async (input: TopUpInput) => {
    const composedNote = [input.date ? `Date: ${input.date}` : null, input.note].filter(Boolean).join(' | ');
    await createPayment({
      customerId: input.customerId,
      amount: input.amount,
      method: input.method === 'vietqr' ? 'bank_transfer' : input.method,
      notes: composedNote || undefined,
      paymentDate: input.date,
      depositType: 'deposit',
    });
  }, []);

  const getWalletByCustomer = useCallback(
    (customerId: string) => wallets.find((w) => w.customerId === customerId) ?? null,
    [wallets],
  );

  const getOutstandingByCustomer = useCallback(
    (customerId: string) => outstandingBalances.filter((b) => b.customerId === customerId),
    [outstandingBalances],
  );

  const getPaymentsByCustomer = useCallback(
    (customerId: string) => payments.filter((p) => p.customerId === customerId),
    [payments],
  );

  const getRecordPaymentTrackers = useCallback((): RecordPaymentTracker[] => {
    const recordMap = new Map<string, RecordPaymentTracker>();
    for (const ob of outstandingBalances) {
      recordMap.set(ob.id, {
        recordId: ob.id,
        recordType: ob.recordType ?? 'saleorder',
        recordName: ob.recordName,
        customerId: ob.customerId,
        customerName: ob.customerName,
        totalCost: ob.totalCost,
        paidAmount: ob.paidAmount,
        remainingBalance: ob.remainingBalance,
        payments: payments.filter((p) => p.customerId === ob.customerId),
      });
    }
    return [...recordMap.values()];
  }, [outstandingBalances, payments]);

  return {
    payments: filteredPayments,
    allPayments: payments,
    wallets,
    outstandingBalances,
    recordPaymentTrackers: getRecordPaymentTrackers(),
    stats,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    createPayment,
    topUpWallet,
    getWalletByCustomer,
    getOutstandingByCustomer,
    getPaymentsByCustomer,
    getRecordPaymentTrackers,
    isLoading,
    error,
    refetch,
  };
}

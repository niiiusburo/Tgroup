/**
 * usePayment - Payment operations, wallet management, and outstanding balances
 * @crossref:used-in[Payment, Services, Customers]
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fetchSaleOrders, type ApiSaleOrder } from '@/lib/api';
import { createPayment as createPaymentApi, fetchPayments as fetchPaymentsApi, confirmPayment as confirmPaymentApi, type ApiPayment } from '@/lib/api/payments';
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

function mapApiPaymentToPayment(payment: ApiPayment): PaymentRecord {
  const allocation = payment.allocations?.[0];
  const recordId = allocation?.invoiceId ?? allocation?.dotkhamId ?? payment.serviceId ?? payment.id;
  const recordName = allocation?.invoiceCode ?? allocation?.invoiceName ?? allocation?.dotkhamName ?? payment.referenceCode ?? payment.receiptNumber ?? payment.id;
  const status: PaymentStatus = payment.status === 'voided' ? 'refunded' : payment.status === 'confirmed' ? 'confirmed' : 'completed';
  return {
    id: payment.id,
    customerId: payment.customerId,
    customerName: '',
    customerPhone: '',
    recordId,
    recordType: allocation?.dotkhamId ? 'dotkham' : 'saleorder',
    recordName,
    amount: payment.amount,
    method: payment.method,
    status,
    date: payment.paymentDate || payment.createdAt?.slice(0, 10) || '',
    locationName: '',
    notes: payment.notes || '',
    receiptNumber: payment.receiptNumber || payment.referenceCode || '',
    referenceCode: payment.referenceCode,
    sources: {
      depositAmount: payment.depositUsed ?? 0,
      cashAmount: payment.cashAmount ?? 0,
      bankAmount: payment.bankAmount ?? 0,
    },
    isFullPayment: true,
    createdBy: payment.createdBy,
    confirmedAt: payment.confirmedAt,
    confirmedBy: payment.confirmedBy,
    confirmedByName: payment.confirmedByName,
    confirmationNotes: payment.confirmationNotes,
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
  const [isLoading, setIsLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
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

      const [saleOrdersResponse, paymentsResponse] = await Promise.all([
        fetchSaleOrders({
          offset: 0,
          limit: 100, // Accommodate all 76 records
          search: search || undefined,
          companyId: selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : undefined,
        }),
        selectedLocationId && selectedLocationId !== 'all'
          ? Promise.resolve(null)
          : fetchPaymentsApi(undefined, 'payments').catch((err) => {
              console.warn('Canonical payments fetch failed, falling back to sale orders:', err);
              return null;
            }),
      ]);

      const saleOrderPayments = saleOrdersResponse.items.map(mapSaleOrderToPayment);
      const paymentRecords = paymentsResponse?.items.length
        ? paymentsResponse.items.map(mapApiPaymentToPayment)
        : saleOrderPayments;
      const outstanding = saleOrdersResponse.items
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

  const refreshPayments = useCallback(async () => {
    await fetchPayments(searchTerm || undefined);
  }, [fetchPayments, searchTerm]);

  /**
   * Refetch data
   */
  const refetch = useCallback(() => {
    void refreshPayments();
  }, [refreshPayments]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  /**
   * Debounced search
   */
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      void refreshPayments();
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [refreshPayments]);

  const filteredPayments = useMemo(() => {
    let result: readonly PaymentRecord[] = payments;

    if (searchTerm) {
      const normalized = searchTerm.toLowerCase();
      result = result.filter((p) =>
        [
          p.customerName,
          p.customerPhone,
          p.recordName,
          p.receiptNumber,
          p.referenceCode,
          p.notes,
        ].some((value) => value?.toLowerCase().includes(normalized)),
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    return [...result].sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, searchTerm, statusFilter]);

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
    const todayParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const getPart = (type: string) => todayParts.find(p => p.type === type)?.value ?? '00';
    const todayStr = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
    const year = parseInt(getPart('year'), 10);
    const newPayment: PaymentRecord = {
      ...input,
      id: `pay-${Date.now()}`,
      recordId: input.recordId ?? '',
      recordType: input.recordType ?? 'saleorder',
      recordName: input.recordName ?? '',
      status: 'completed',
      date: todayStr,
      receiptNumber: `RCP-${year}-${String(Date.now()).slice(-3)}`,
      isFullPayment: true,
    };

    setPayments((prev) => [newPayment, ...prev]);
    return newPayment;
  }, []);

  const topUpWallet = useCallback(async (input: TopUpInput) => {
    const composedNote = [input.date ? `Date: ${input.date}` : null, input.note].filter(Boolean).join(' | ');
    await createPaymentApi({
      customerId: input.customerId,
      amount: input.amount,
      method: input.method === 'vietqr' ? 'bank_transfer' : input.method,
      notes: composedNote || undefined,
      paymentDate: input.date,
      depositType: 'deposit',
    });
    await refreshPayments();
  }, [refreshPayments]);

  const confirmPayment = useCallback(async (paymentId: string, confirmed: boolean, notes?: string) => {
    setConfirmingId(paymentId);
    try {
      await confirmPaymentApi(paymentId, { confirmed, notes });
      await refreshPayments();
    } finally {
      setConfirmingId(null);
    }
  }, [refreshPayments]);

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
    confirmPayment,
    getWalletByCustomer,
    getOutstandingByCustomer,
    getPaymentsByCustomer,
    getRecordPaymentTrackers,
    isLoading,
    confirmingId,
    error,
    refetch,
  };
}

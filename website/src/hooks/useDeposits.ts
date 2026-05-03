import { useState, useCallback, useRef } from 'react';
import {
  fetchDeposits,
  fetchDepositUsage,
  fetchCustomerBalance,
  createPayment,
  createRefund,
  voidPayment,
  updatePayment,
  deletePayment,
} from '@/lib/api';
import type { ApiPayment } from '@/lib/api';

export interface DepositTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'deposit' | 'refund' | 'withdrawal';
  method: string;
  note: string;
  receiptNumber?: string;
  referenceCode?: string;
  balanceAfter?: number;
  status?: string;
}

export interface DepositBalance {
  depositBalance: number;
  outstandingBalance: number;
  totalDeposited: number;
  totalUsed: number;
  totalRefunded: number;
}

/** Raw payment method codes from API. Components translate with the payment namespace methods.<code> key. */
export type PaymentMethodCode =
  | 'cash'
  | 'bank'
  | 'bank_transfer'
  | 'deposit'
  | 'mixed'
  | 'momo'
  | 'card'
  | 'wallet'
  | string;

function getVietnamToday(): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = (type: string) => parts.find((x) => x.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function mapToDepositTransaction(p: ApiPayment): DepositTransaction {
  const isRefund = p.depositType === 'refund' || p.amount < 0;
  return {
    id: p.id,
    date: p.paymentDate || p.createdAt?.slice(0, 10) || getVietnamToday(),
    amount: Math.abs(p.amount),
    type: isRefund ? 'refund' : 'deposit',
    method: p.method,
    note: p.notes || (isRefund ? 'refund' : 'deposit'),
    receiptNumber: p.receiptNumber,
    referenceCode: p.referenceCode,
    status: p.status,
  };
}

function mapToUsageTransaction(p: ApiPayment): DepositTransaction {
  const depositUsed = p.depositUsed ?? 0;
  const amountFromDeposit = p.method === 'deposit' ? p.amount : depositUsed;
  return {
    id: p.id,
    date: p.paymentDate || p.createdAt?.slice(0, 10) || getVietnamToday(),
    amount: amountFromDeposit,
    type: 'withdrawal',
    method: 'deposit',
    note: p.notes || 'paymentFromWallet',
    receiptNumber: p.receiptNumber,
    referenceCode: p.referenceCode,
    status: p.status,
  };
}

export interface DepositFilters {
  dateFrom?: string;
  dateTo?: string;
  receiptNumber?: string;
  type?: 'deposit' | 'refund' | 'all';
}

export function useDeposits() {
  const [depositList, setDepositList] = useState<DepositTransaction[]>([]);
  const [usageHistory, setUsageHistory] = useState<DepositTransaction[]>([]);
  const [balance, setBalance] = useState<DepositBalance>({
    depositBalance: 0,
    outstandingBalance: 0,
    totalDeposited: 0,
    totalUsed: 0,
    totalRefunded: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastLoadRef = useRef<{ customerId: string; filters?: DepositFilters } | null>(null);

  const loadDeposits = useCallback(async (customerId: string, filters?: DepositFilters) => {
    lastLoadRef.current = { customerId, filters };
    setLoading(true);
    setError(null);
    try {
      const [depositsRes, usageRes, balanceData] = await Promise.all([
        fetchDeposits({
          customerId,
          dateFrom: filters?.dateFrom,
          dateTo: filters?.dateTo,
          receiptNumber: filters?.receiptNumber,
          type: filters?.type ?? 'all',
        }),
        fetchDepositUsage({
          customerId,
          dateFrom: filters?.dateFrom,
          dateTo: filters?.dateTo,
        }),
        fetchCustomerBalance(customerId).catch(() => ({
          id: customerId,
          name: '',
          depositBalance: 0,
          outstandingBalance: 0,
          totalDeposited: 0,
          totalUsed: 0,
          totalRefunded: 0,
        })),
      ]);

      setDepositList(depositsRes.items.map(mapToDepositTransaction));
      setUsageHistory(usageRes.items.map(mapToUsageTransaction));
      setBalance(balanceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deposits');
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadCurrentDeposits = useCallback(async () => {
    const lastLoad = lastLoadRef.current;
    if (lastLoad) {
      await loadDeposits(lastLoad.customerId, lastLoad.filters);
    }
  }, [loadDeposits]);

  const addDeposit = useCallback(async (
    customerId: string,
    amount: number,
    method: 'cash' | 'bank_transfer' | 'vietqr',
    date?: string,
    note?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const composedNote = [date ? `Date: ${date}` : null, note].filter(Boolean).join(' | ');
      await createPayment({
        customerId,
        amount,
        method: method === 'vietqr' ? 'bank_transfer' : method,
        notes: composedNote,
        paymentDate: date,
        depositType: 'deposit',
      });
      await loadDeposits(customerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add deposit');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadDeposits]);

  const addRefund = useCallback(async (
    customerId: string,
    amount: number,
    method: 'cash' | 'bank_transfer',
    date?: string,
    note?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      await createRefund({
        customerId,
        amount,
        method,
        notes: note,
        paymentDate: date,
      });
      await loadDeposits(customerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add refund');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadDeposits]);

  const voidDeposit = useCallback(async (id: string, reason?: string) => {
    setLoading(true);
    try {
      await voidPayment(id, reason);
      await reloadCurrentDeposits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to void deposit');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [reloadCurrentDeposits]);

  const removeDeposit = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await deletePayment(id);
      await reloadCurrentDeposits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete deposit');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [reloadCurrentDeposits]);

  const editDeposit = useCallback(async (
    id: string,
    data: Partial<{ amount: number; method: 'cash' | 'bank_transfer'; notes: string; paymentDate: string }>
  ) => {
    setLoading(true);
    try {
      await updatePayment(id, {
        amount: data.amount,
        method: data.method,
        notes: data.notes,
        paymentDate: data.paymentDate,
      });
      await reloadCurrentDeposits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update deposit');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [reloadCurrentDeposits]);

  return {
    depositList,
    usageHistory,
    balance,
    loading,
    error,
    loadDeposits,
    addDeposit,
    addRefund,
    voidDeposit,
    removeDeposit,
    editDeposit,
  };
}

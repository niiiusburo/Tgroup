import { useState, useCallback } from 'react';
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

function formatMethod(method: string): string {
  const map: Record<string, string> = {
    cash: 'Tiền mặt',
    bank_transfer: 'Chuyển khoản',
    deposit: 'Ví cọc',
    mixed: 'Kết hợp',
    momo: 'MoMo',
    card: 'Thẻ',
    wallet: 'Ví điện tử',
  };
  return map[method] || method;
}

function mapToDepositTransaction(p: ApiPayment): DepositTransaction {
  const isRefund = p.depositType === 'refund' || p.amount < 0;
  return {
    id: p.id,
    date: p.paymentDate || p.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    amount: Math.abs(p.amount),
    type: isRefund ? 'refund' : 'deposit',
    method: formatMethod(p.method),
    note: p.notes || (isRefund ? 'Hoàn tạm ứng' : 'Đóng tạm ứng'),
    receiptNumber: p.receiptNumber,
    status: p.status,
  };
}

function mapToUsageTransaction(p: ApiPayment): DepositTransaction {
  const depositUsed = p.depositUsed ?? 0;
  const amountFromDeposit = p.method === 'deposit' ? p.amount : depositUsed;
  return {
    id: p.id,
    date: p.paymentDate || p.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    amount: amountFromDeposit,
    type: 'withdrawal',
    method: formatMethod('deposit'),
    note: p.notes || 'Thanh toán từ ví cọc',
    receiptNumber: p.receiptNumber,
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

  const loadDeposits = useCallback(async (customerId: string, filters?: DepositFilters) => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add deposit');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add refund');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const voidDeposit = useCallback(async (id: string, reason?: string) => {
    setLoading(true);
    try {
      await voidPayment(id, reason);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to void deposit');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeDeposit = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await deletePayment(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete deposit');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update deposit');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

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

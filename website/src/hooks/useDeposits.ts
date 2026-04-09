import { useState, useCallback } from 'react';
import { fetchPayments, createPayment, fetchCustomerBalance } from '@/lib/api';

export interface DepositTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'payment';
  method: string;
  note: string;
  balanceAfter: number;
}

export interface DepositBalance {
  depositBalance: number;
  outstandingBalance: number;
}

export function useDeposits() {
  const [deposits, setDeposits] = useState<DepositTransaction[]>([]);
  const [balance, setBalance] = useState<DepositBalance>({ depositBalance: 0, outstandingBalance: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDeposits = useCallback(async (customerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const paymentsRes = await fetchPayments(customerId);
      let balanceData: DepositBalance = { depositBalance: 0, outstandingBalance: 0 };
      try {
        balanceData = await fetchCustomerBalance(customerId);
      } catch {
        // If balance fetch fails, calculate from payments as fallback
      }

      const transactions: DepositTransaction[] = paymentsRes.items.map((p) => {
        const isDeposit = p.method === 'cash' || p.method === 'bank';
        const amount = Number(p.amount) || 0;
        return {
          id: p.id,
          date: p.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          amount: isDeposit ? amount : -amount,
          type: isDeposit ? 'deposit' : 'withdrawal',
          method: p.method,
          note: p.notes || (isDeposit ? 'Deposit added' : 'Deposit used'),
          balanceAfter: 0,
        };
      });

      transactions.sort((a, b) => b.date.localeCompare(a.date));

      let runningBalance = balanceData.depositBalance;
      const withBalance = transactions.map((t) => {
        const result = { ...t, balanceAfter: runningBalance };
        runningBalance -= t.amount;
        return result;
      });

      setDeposits(withBalance);
      setBalance({
        depositBalance: balanceData.depositBalance,
        outstandingBalance: balanceData.outstandingBalance,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deposits');
    } finally {
      setLoading(false);
    }
  }, []);

  const addDeposit = useCallback(async (
    customerId: string,
    amount: number,
    method: 'cash' | 'bank',
    note?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      await createPayment({ customerId, amount, method, notes: note });
      await loadDeposits(customerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add deposit');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadDeposits]);

  return {
    deposits,
    balance,
    loading,
    error,
    loadDeposits,
    addDeposit,
  };
}

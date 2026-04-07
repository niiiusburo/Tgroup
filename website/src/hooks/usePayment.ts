/**
 * usePayment - Payment operations, wallet management, and outstanding balances
 * @crossref:used-in[Payment, Services, Customers]
 */

import { useState, useMemo, useCallback } from 'react';
import {
  MOCK_PAYMENT_RECORDS,
  MOCK_DEPOSIT_WALLETS,
  MOCK_OUTSTANDING_BALANCES,
  type PaymentRecord,
  type PaymentMethod,
  type PaymentStatus,
  type DepositWalletData,
  type OutstandingBalanceItem,
} from '@/data/mockPayment';

export type PaymentFilter = 'all' | PaymentStatus;

export interface CreatePaymentInput {
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly serviceId: string;
  readonly serviceName: string;
  readonly amount: number;
  readonly method: PaymentMethod;
  readonly locationName: string;
  readonly notes: string;
}

export interface TopUpInput {
  readonly customerId: string;
  readonly amount: number;
  readonly description: string;
}

export function usePayment() {
  const [payments, setPayments] = useState<readonly PaymentRecord[]>([...MOCK_PAYMENT_RECORDS]);
  const [wallets, setWallets] = useState<readonly DepositWalletData[]>([...MOCK_DEPOSIT_WALLETS]);
  const [outstandingBalances] = useState<readonly OutstandingBalanceItem[]>([...MOCK_OUTSTANDING_BALANCES]);
  const [statusFilter, setStatusFilter] = useState<PaymentFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPayments = useMemo(() => {
    let result: readonly PaymentRecord[] = payments;

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.customerName.toLowerCase().includes(lower) ||
          p.customerPhone.includes(lower) ||
          p.serviceName.toLowerCase().includes(lower) ||
          p.receiptNumber.toLowerCase().includes(lower),
      );
    }

    return [...result].sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const completed = payments.filter((p) => p.status === 'completed');
    const totalRevenue = completed.reduce((sum, p) => sum + p.amount, 0);
    const totalOutstanding = outstandingBalances.reduce((sum, b) => sum + b.remainingBalance, 0);
    const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

    return {
      totalPayments: payments.length,
      completedPayments: completed.length,
      totalRevenue,
      totalOutstanding,
      totalWalletBalance,
      activeWallets: wallets.length,
    };
  }, [payments, outstandingBalances, wallets]);

  const createPayment = useCallback((input: CreatePaymentInput) => {
    const newPayment: PaymentRecord = {
      ...input,
      id: `pay-${Date.now()}`,
      status: 'completed',
      date: new Date().toISOString().slice(0, 10),
      receiptNumber: `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
    };

    setPayments((prev) => [newPayment, ...prev]);
    return newPayment;
  }, []);

  const topUpWallet = useCallback((input: TopUpInput) => {
    setWallets((prev) =>
      prev.map((w) => {
        if (w.customerId !== input.customerId) return w;
        return {
          ...w,
          balance: w.balance + input.amount,
          lastTopUp: new Date().toISOString().slice(0, 10),
          transactions: [
            {
              id: `wt-${Date.now()}`,
              date: new Date().toISOString().slice(0, 10),
              amount: input.amount,
              type: 'topup' as const,
              description: input.description,
              referenceId: null,
            },
            ...w.transactions,
          ],
        };
      }),
    );
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

  return {
    payments: filteredPayments,
    allPayments: payments,
    wallets,
    outstandingBalances,
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
  };
}

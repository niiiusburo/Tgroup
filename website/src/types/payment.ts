/**
 * Payment-related type definitions
 * @crossref:used-in[Payment, usePayment, DepositWallet, PaymentForm, OutstandingBalance, PaymentHistory]
 */

export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'wallet' | 'momo' | 'deposit' | 'mixed';
export type PaymentStatus = 'completed' | 'pending' | 'failed' | 'refunded';
export type WalletTransactionType = 'topup' | 'payment' | 'refund';

export interface WalletTransaction {
  readonly id: string;
  readonly date: string;
  readonly amount: number;
  readonly type: WalletTransactionType;
  readonly description: string;
  readonly referenceId: string | null;
}

export interface DepositWalletData {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly balance: number;
  readonly lastTopUp: string;
  readonly transactions: readonly WalletTransaction[];
}

export interface PaymentRecord {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly serviceId?: string;
  readonly serviceName?: string;
  readonly amount: number;
  readonly method: PaymentMethod;
  readonly status: PaymentStatus;
  readonly date: string;
  readonly locationName: string;
  readonly notes: string;
  readonly receiptNumber: string;
}

export interface OutstandingBalanceItem {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly serviceName: string;
  readonly totalCost: number;
  readonly paidAmount: number;
  readonly outstandingAmount?: number;
  readonly remainingBalance: number;
  readonly dueDate: string;
  readonly locationName: string;
}

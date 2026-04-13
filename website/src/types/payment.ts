/**
 * Payment-related type definitions
 * @crossref:used-in[Payment, usePayment, DepositWallet, PaymentForm, OutstandingBalance, PaymentHistory]
 */

/** Live payment methods matching the backend `payments.method` column. */
export type PaymentMethod = 'cash' | 'bank_transfer' | 'deposit' | 'mixed';

/** Display statuses derived from backend `posted`/`voided` + payment state. */
export type PaymentStatus = 'completed' | 'pending' | 'partial' | 'refunded';

export type RecordType = 'saleorder' | 'dotkham';
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
  readonly recordId: string;
  readonly recordType: RecordType;
  readonly recordName: string;
  readonly amount: number;
  readonly method: PaymentMethod;
  readonly status: PaymentStatus;
  readonly date: string;
  readonly locationName: string;
  readonly notes: string;
  readonly receiptNumber: string;
  /** Source breakdown for mixed payments. */
  readonly sources?: {
    readonly depositAmount: number;
    readonly cashAmount: number;
    readonly bankAmount: number;
  };
  /** true = one-shot full payment covering the entire remaining balance. */
  readonly isFullPayment: boolean;
  /** Due date for scheduled/installment payments. */
  readonly dueDate?: string;
}

export interface OutstandingBalanceItem {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly recordType: RecordType;
  readonly recordName: string;
  readonly totalCost: number;
  readonly paidAmount: number;
  readonly outstandingAmount?: number;
  readonly remainingBalance: number;
  readonly dueDate: string;
  readonly locationName: string;
}

/** Aggregate payment tracker for a single service record. */
export interface RecordPaymentTracker {
  readonly recordId: string;
  readonly recordType: RecordType;
  readonly recordName: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly totalCost: number;
  readonly paidAmount: number;
  readonly remainingBalance: number;
  readonly payments: readonly PaymentRecord[];
}

/**
 * Payment types re-exported from /types/
 * @crossref:used-in[Payment, usePayment, DepositWallet, PaymentForm]
 */

import type { PaymentMethod, PaymentStatus, WalletTransactionType, WalletTransaction, DepositWalletData, PaymentRecord, OutstandingBalanceItem } from '@/types/payment';

export type { PaymentMethod, PaymentStatus, WalletTransactionType, WalletTransaction, DepositWalletData, PaymentRecord, OutstandingBalanceItem };

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  completed: 'Completed',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
};

export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-500',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  wallet: 'Wallet',
  momo: 'MoMo',
  deposit: 'Deposit',
  mixed: 'Mixed',
};

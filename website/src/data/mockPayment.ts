/**
 * Payment types re-exported from /types/
 * @crossref:used-in[Payment, usePayment, DepositWallet, PaymentForm]
 */

import type {
  PaymentMethod, PaymentStatus, RecordType, WalletTransactionType,
  WalletTransaction, DepositWalletData, PaymentRecord,
  OutstandingBalanceItem, RecordPaymentTracker,
} from '@/types/payment';

export type {
  PaymentMethod, PaymentStatus, RecordType, WalletTransactionType,
  WalletTransaction, DepositWalletData, PaymentRecord,
  OutstandingBalanceItem, RecordPaymentTracker,
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  completed: 'Hoàn tất',
  pending: 'Chờ xử lý',
  partial: 'Thanh toán một phần',
  refunded: 'Đã hủy',
};

export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  partial: 'bg-blue-100 text-blue-700',
  refunded: 'bg-gray-100 text-gray-500',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  deposit: 'Từ ví',
  mixed: 'Kết hợp',
};

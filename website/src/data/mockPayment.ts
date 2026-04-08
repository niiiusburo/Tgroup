/**
 * Mock data for Payment and Deposit Wallet
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
  readonly serviceId: string;
  readonly serviceName: string;
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
  readonly remainingBalance: number;
  readonly dueDate: string;
  readonly locationName: string;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  wallet: 'Wallet',
  momo: 'MoMo',
  deposit: 'Deposit',
  mixed: 'Mixed',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  completed: 'Completed',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
};

export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
};

const today = new Date();

function offsetDate(days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const MOCK_DEPOSIT_WALLETS: readonly DepositWalletData[] = [
  {
    id: 'wallet-1',
    customerId: 'cust-1',
    customerName: 'Nguyen Van A',
    balance: 8_500_000,
    lastTopUp: '2026-03-01',
    transactions: [
      { id: 'wt-1', date: '2026-03-01', amount: 10_000_000, type: 'topup', description: 'Nap tien vi', referenceId: null },
      { id: 'wt-2', date: '2026-03-15', amount: -1_500_000, type: 'payment', description: 'Thanh toan lam sach rang', referenceId: 'pay-1' },
      { id: 'wt-3', date: '2026-02-01', amount: 5_000_000, type: 'topup', description: 'Nap tien vi', referenceId: null },
      { id: 'wt-4', date: '2026-02-10', amount: -3_200_000, type: 'payment', description: 'Thanh toan tay trang rang', referenceId: 'pay-3' },
      { id: 'wt-5', date: '2026-01-15', amount: -1_800_000, type: 'payment', description: 'Thanh toan chinh nha', referenceId: 'pay-5' },
    ],
  },
  {
    id: 'wallet-2',
    customerId: 'cust-2',
    customerName: 'Tran Thi B',
    balance: 3_200_000,
    lastTopUp: '2026-02-15',
    transactions: [
      { id: 'wt-6', date: '2026-02-15', amount: 5_000_000, type: 'topup', description: 'Nap tien vi', referenceId: null },
      { id: 'wt-7', date: '2026-03-01', amount: -1_800_000, type: 'payment', description: 'Thanh toan dieu tri tuy', referenceId: 'pay-2' },
    ],
  },
  {
    id: 'wallet-3',
    customerId: 'cust-4',
    customerName: 'Pham Thi D',
    balance: 12_000_000,
    lastTopUp: '2026-03-20',
    transactions: [
      { id: 'wt-8', date: '2026-03-20', amount: 15_000_000, type: 'topup', description: 'Nap tien vi', referenceId: null },
      { id: 'wt-9', date: '2026-03-25', amount: -3_000_000, type: 'payment', description: 'Thanh toan cay ghep rang', referenceId: 'pay-4' },
    ],
  },
];

export const MOCK_PAYMENT_RECORDS: readonly PaymentRecord[] = [
  {
    id: 'pay-1', customerId: 'cust-1', customerName: 'Nguyen Van A', customerPhone: '0901-111-222',
    serviceId: 'svc-r6', serviceName: 'Lam sach rang', amount: 1_500_000, method: 'wallet',
    status: 'completed', date: offsetDate(-5), locationName: 'Chi nhanh Quan 1',
    notes: 'Thanh toan tu vi', receiptNumber: 'RCP-2026-001',
  },
  {
    id: 'pay-2', customerId: 'cust-2', customerName: 'Tran Thi B', customerPhone: '0912-222-333',
    serviceId: 'svc-r2', serviceName: 'Dieu tri tuy rang', amount: 2_500_000, method: 'bank_transfer',
    status: 'completed', date: offsetDate(-7), locationName: 'Chi nhanh Quan 1',
    notes: 'Chuyen khoan ngan hang', receiptNumber: 'RCP-2026-002',
  },
  {
    id: 'pay-3', customerId: 'cust-1', customerName: 'Nguyen Van A', customerPhone: '0901-111-222',
    serviceId: 'svc-r3', serviceName: 'Tay trang rang', amount: 6_000_000, method: 'card',
    status: 'completed', date: offsetDate(-14), locationName: 'Chi nhanh Quan 7',
    notes: 'Thanh toan the tin dung', receiptNumber: 'RCP-2026-003',
  },
  {
    id: 'pay-4', customerId: 'cust-4', customerName: 'Pham Thi D', customerPhone: '0904-444-555',
    serviceId: 'svc-r4', serviceName: 'Cay ghep rang Implant', amount: 10_000_000, method: 'wallet',
    status: 'completed', date: offsetDate(-3), locationName: 'Chi nhanh Quan 1',
    notes: 'Dot thanh toan 2/3', receiptNumber: 'RCP-2026-004',
  },
  {
    id: 'pay-5', customerId: 'cust-5', customerName: 'Hoang Van E', customerPhone: '0905-555-666',
    serviceId: 'svc-r5', serviceName: 'Dan su Veneer', amount: 5_000_000, method: 'cash',
    status: 'completed', date: offsetDate(-1), locationName: 'Chi nhanh Quan 7',
    notes: 'Dat coc', receiptNumber: 'RCP-2026-005',
  },
  {
    id: 'pay-6', customerId: 'cust-7', customerName: 'Dao Van G', customerPhone: '0907-777-888',
    serviceId: 'svc-r7', serviceName: 'Nho rang khon', amount: 3_000_000, method: 'momo',
    status: 'completed', date: offsetDate(-5), locationName: 'Chi nhanh Quan 1',
    notes: 'Thanh toan qua MoMo', receiptNumber: 'RCP-2026-006',
  },
  {
    id: 'pay-7', customerId: 'cust-3', customerName: 'Le Van C', customerPhone: '0903-333-444',
    serviceId: 'svc-r3', serviceName: 'Tay trang rang', amount: 6_000_000, method: 'bank_transfer',
    status: 'refunded', date: offsetDate(-20), locationName: 'Chi nhanh Quan 7',
    notes: 'Hoan tien do huy dich vu', receiptNumber: 'RCP-2026-007',
  },
  {
    id: 'pay-8', customerId: 'cust-6', customerName: 'Vo Thi F', customerPhone: '0906-666-777',
    serviceId: 'svc-r6', serviceName: 'Lam sach rang', amount: 1_500_000, method: 'cash',
    status: 'completed', date: offsetDate(-3), locationName: 'Chi nhanh Thu Duc',
    notes: 'Thanh toan tien mat', receiptNumber: 'RCP-2026-008',
  },
];

export const MOCK_OUTSTANDING_BALANCES: readonly OutstandingBalanceItem[] = [
  {
    id: 'ob-1', customerId: 'cust-1', customerName: 'Nguyen Van A', customerPhone: '0901-111-222',
    serviceName: 'Nieng rang kim loai', totalCost: 25_000_000, paidAmount: 20_000_000,
    remainingBalance: 5_000_000, dueDate: offsetDate(30), locationName: 'Chi nhanh Quan 1',
  },
  {
    id: 'ob-2', customerId: 'cust-2', customerName: 'Tran Thi B', customerPhone: '0912-222-333',
    serviceName: 'Dieu tri tuy rang', totalCost: 4_500_000, paidAmount: 2_500_000,
    remainingBalance: 2_000_000, dueDate: offsetDate(7), locationName: 'Chi nhanh Quan 1',
  },
  {
    id: 'ob-3', customerId: 'cust-4', customerName: 'Pham Thi D', customerPhone: '0904-444-555',
    serviceName: 'Cay ghep rang Implant', totalCost: 18_000_000, paidAmount: 10_000_000,
    remainingBalance: 8_000_000, dueDate: offsetDate(60), locationName: 'Chi nhanh Quan 1',
  },
  {
    id: 'ob-4', customerId: 'cust-5', customerName: 'Hoang Van E', customerPhone: '0905-555-666',
    serviceName: 'Dan su Veneer', totalCost: 16_000_000, paidAmount: 5_000_000,
    remainingBalance: 11_000_000, dueDate: offsetDate(45), locationName: 'Chi nhanh Quan 7',
  },
];

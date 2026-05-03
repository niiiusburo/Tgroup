import { screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { CustomerDeposits } from './CustomerDeposits';
import type { DepositTransaction, DepositBalance } from '@/hooks/useDeposits';

vi.mock('@/hooks/useBankSettings', () => ({
  useBankSettings: () => ({
    settings: null,
    loading: false,
    error: null,
    refresh: vi.fn(),
    updateSettings: vi.fn(),
  }),
}));

const mockDepositList: DepositTransaction[] = [
  { id: 'd1', date: '2024-12-01', amount: 2000000, type: 'deposit', method: 'Tiền mặt', note: '', receiptNumber: 'REC-001', referenceCode: 'CUST.IN/2024/27094', status: 'posted' },
  { id: 'd2', date: '2024-12-02', amount: 1500000, type: 'deposit', method: 'Chuyển khoản', note: '', receiptNumber: '', referenceCode: 'CUST.IN/2024/27095', status: 'posted' },
];

const mockBalance: DepositBalance = {
  depositBalance: 3500000,
  outstandingBalance: 0,
  totalDeposited: 3500000,
  totalUsed: 0,
  totalRefunded: 0,
};

describe('CustomerDeposits deposit list', () => {
  it('shows referenceCode as primary identifier in deposits table', () => {
    renderWithProviders(
      <CustomerDeposits
        depositList={mockDepositList}
        usageHistory={[]}
        balance={mockBalance}
      />
    );

    expect(screen.getByText('CUST.IN/2024/27094')).toBeInTheDocument();
    expect(screen.getByText('CUST.IN/2024/27095')).toBeInTheDocument();
  });

  it('shows receiptNumber alongside referenceCode when both exist', () => {
    renderWithProviders(
      <CustomerDeposits
        depositList={mockDepositList}
        usageHistory={[]}
        balance={mockBalance}
      />
    );

    expect(screen.getByText('CUST.IN/2024/27094')).toBeInTheDocument();
    expect(screen.getByText('REC-001')).toBeInTheDocument();
  });
});

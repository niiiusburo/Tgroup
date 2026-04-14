import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EditPaymentModal } from './EditPaymentModal';
import type { ApiPayment } from '@/lib/api';

const mockPayment: ApiPayment = {
  id: 'p1',
  customerId: 'c1',
  amount: 2000000,
  method: 'cash',
  createdAt: '2024-12-05T00:00:00Z',
  referenceCode: 'CUST.IN/2024/27094',
  receiptNumber: 'REC-001',
  status: 'posted',
};

const mockPaymentNoRef: ApiPayment = {
  id: 'p2',
  customerId: 'c1',
  amount: 1500000,
  method: 'bank_transfer',
  createdAt: '2024-12-06T00:00:00Z',
  receiptNumber: 'REC-002',
  status: 'posted',
};

describe('EditPaymentModal header', () => {
  it('shows referenceCode in header when present', () => {
    render(
      <EditPaymentModal
        payment={mockPayment}
        isOpen={true}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    expect(screen.getByText(/CUST.IN\/2024\/27094/)).toBeInTheDocument();
  });

  it('falls back to receiptNumber in header when referenceCode is missing', () => {
    render(
      <EditPaymentModal
        payment={mockPaymentNoRef}
        isOpen={true}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    expect(screen.getByText(/Receipt: REC-002/)).toBeInTheDocument();
  });
});

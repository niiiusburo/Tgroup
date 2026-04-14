import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ServiceHistory } from './ServiceHistory';
import type { CustomerService } from '@/types/customer';
import type { PaymentWithAllocations } from '@/hooks/useCustomerPayments';

const mockServices: CustomerService[] = [
  { id: 's1', date: '2024-12-01', service: 'Cleaning', doctor: 'Dr A', cost: 2000000, status: 'completed', tooth: '', notes: '' },
];

const mockPayments: PaymentWithAllocations[] = [
  {
    id: 'p1',
    customerId: '1',
    serviceId: 's1',
    amount: 1500000,
    method: 'cash',
    depositUsed: 0,
    cashAmount: 1500000,
    bankAmount: 0,
    createdAt: '2024-12-05T00:00:00Z',
    referenceCode: 'CUST.IN/2024/27094',
    receiptNumber: 'REC-001',
    status: 'posted',
    allocations: [],
  },
  {
    id: 'p2',
    customerId: '1',
    serviceId: 's1',
    amount: 500000,
    method: 'bank_transfer',
    depositUsed: 0,
    cashAmount: 0,
    bankAmount: 500000,
    createdAt: '2024-12-06T00:00:00Z',
    referenceCode: 'CUST.IN/2024/27095',
    status: 'posted',
    allocations: [],
  },
];

describe('ServiceHistory payment history', () => {
  it('shows referenceCode as primary identifier for related payments when expanded', () => {
    render(
      <ServiceHistory
        services={mockServices}
        payments={mockPayments}
        onEditPayment={vi.fn()}
      />
    );

    // Expand the service card
    fireEvent.click(screen.getByText('Cleaning'));

    expect(screen.getByText('CUST.IN/2024/27094')).toBeInTheDocument();
    expect(screen.getByText('CUST.IN/2024/27095')).toBeInTheDocument();
  });

  it('shows receiptNumber alongside referenceCode when both exist', () => {
    render(
      <ServiceHistory
        services={mockServices}
        payments={mockPayments}
        onEditPayment={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Cleaning'));

    expect(screen.getByText('CUST.IN/2024/27094')).toBeInTheDocument();
    expect(screen.getByText('REC-001')).toBeInTheDocument();
  });
});

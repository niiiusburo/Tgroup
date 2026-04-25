import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ServiceHistory } from './ServiceHistory';
import type { CustomerService } from '@/types/customer';
import type { PaymentWithAllocations } from '@/hooks/useCustomerPayments';

const mockServices: CustomerService[] = [
  {
    id: 's1',
    date: '2024-12-01',
    service: 'Cleaning',
    doctor: 'Dr A',
    cost: 2000000,
    paidAmount: 1500000,
    residual: 500000,
    status: 'completed',
    tooth: 'manual',
    notes: '',
  },
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
  it('renders the tooth marker and tooth value in the diagnosis column', () => {
    render(<ServiceHistory services={mockServices} />);

    expect(screen.getAllByLabelText('Tooth')).toHaveLength(2);
    expect(screen.getByText('manual')).toBeInTheDocument();
  });

  it('shows an orange pay pill with progress fill for services that still have residual debt', () => {
    const onPayForService = vi.fn();

    render(
      <ServiceHistory
        services={mockServices}
        onPayForService={onPayForService}
      />
    );

    const payButton = screen.getByRole('button', { name: /pay 500\.000 ₫/ });
    expect(payButton).toHaveClass('bg-orange-50', 'border-orange-300', 'rounded-full');

    fireEvent.click(payButton);
    expect(onPayForService).toHaveBeenCalledWith(mockServices[0]);
  });

  it('derives residual from the displayed paid amount when imported residual is stale', () => {
    render(
      <ServiceHistory
        services={[
          {
            id: 'so57144-line',
            date: '2026-02-11',
            service: 'Niềng Mắc Cài Kim Loại Tiêu Chuẩn',
            doctor: 'N/A',
            cost: 19200000,
            paidAmount: 7212666,
            residual: 12654000,
            status: 'active',
            tooth: '17',
            notes: '',
          },
          {
            id: 'so55172-line',
            date: '2026-01-15',
            service: 'Treatment',
            doctor: 'N/A',
            cost: 8800000,
            paidAmount: 8800000,
            residual: 0,
            status: 'active',
            tooth: '-',
            notes: '',
          },
        ]}
      />
    );

    expect(screen.getByText('28.000.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('/ 16.012.666 ₫')).toBeInTheDocument();
    expect(screen.getByText('11.987.334 ₫')).toBeInTheDocument();
    expect(screen.queryByText('12.654.000 ₫')).not.toBeInTheDocument();
  });

  it('shows referenceCode as primary identifier for related payments when expanded', () => {
    render(
      <ServiceHistory
        services={mockServices}
        payments={mockPayments}
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
      />
    );

    fireEvent.click(screen.getByText('Cleaning'));

    expect(screen.getByText('CUST.IN/2024/27094')).toBeInTheDocument();
    expect(screen.getByText('REC-001')).toBeInTheDocument();
  });
});

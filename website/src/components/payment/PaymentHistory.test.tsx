import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PaymentHistory } from './PaymentHistory';
import type { PaymentRecord } from '@/data/mockPayment';

const mockPayments: PaymentRecord[] = [
  {
    id: 'p1',
    customerId: 'c1',
    customerName: 'Alice',
    customerPhone: '0909123456',
    recordId: 'r1',
    recordType: 'saleorder',
    recordName: 'Cleaning',
    amount: 2000000,
    method: 'cash',
    status: 'completed',
    date: '2024-12-01',
    locationName: 'Clinic 1',
    notes: '',
    receiptNumber: 'REC-001',
    referenceCode: 'CUST.IN/2024/27094',
    isFullPayment: true,
  },
  {
    id: 'p2',
    customerId: 'c2',
    customerName: 'Bob',
    customerPhone: '0909123457',
    recordId: 'r2',
    recordType: 'saleorder',
    recordName: 'Filling',
    amount: 1500000,
    method: 'bank_transfer',
    status: 'completed',
    date: '2024-12-02',
    locationName: 'Clinic 2',
    notes: '',
    receiptNumber: '',
    referenceCode: 'CUST.IN/2024/27095',
    isFullPayment: true,
  },
];

describe('PaymentHistory', () => {
  it('shows referenceCode as primary identifier in the receipt column', () => {
    render(<PaymentHistory payments={mockPayments} />);

    expect(screen.getByText('CUST.IN/2024/27094')).toBeInTheDocument();
    expect(screen.getByText('CUST.IN/2024/27095')).toBeInTheDocument();
  });

  it('shows receiptNumber alongside referenceCode when both exist', () => {
    render(<PaymentHistory payments={mockPayments} />);

    expect(screen.getByText('CUST.IN/2024/27094')).toBeInTheDocument();
    expect(screen.getByText('REC-001')).toBeInTheDocument();
  });
});

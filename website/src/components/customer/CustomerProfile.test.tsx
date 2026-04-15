import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { CustomerProfile } from './CustomerProfile';
import type { CustomerProfileData } from '@/hooks/useCustomerProfile';
import type { PaymentWithAllocations } from '@/hooks/useCustomerPayments';
import type { CustomerService } from '@/types/customer';

const mockProfile: CustomerProfileData = {
  id: '1',
  name: 'Test Patient',
  phone: '0909123456',
  email: '',
  gender: 'male',
  dateOfBirth: '01/01/1990',
  address: 'HCMC',
  notes: '',
  medicalHistory: '',
  tags: [],
  memberSince: '2024-01-01',
  totalVisits: 2,
  lastVisit: '2024-12-01',
  totalSpent: 0,
  companyId: 'c1',
  companyName: 'Clinic 1',
  code: 'KH001',
  depositBalance: 500000,
  outstandingBalance: 1000000,
};

const mockServices: CustomerService[] = [
  { id: 's1', date: '2024-12-01', service: 'Cleaning', doctor: 'Dr A', cost: 2000000, status: 'completed', tooth: '', notes: '' },
  { id: 's2', date: '2024-12-10', service: 'Filling', doctor: 'Dr B', cost: 1500000, status: 'completed', tooth: '', notes: '' },
];

const mockPayments: PaymentWithAllocations[] = [
  {
    id: 'p1',
    customerId: '1',
    amount: 2000000,
    method: 'cash',
    depositUsed: 0,
    cashAmount: 2000000,
    bankAmount: 0,
    createdAt: '2024-12-05T00:00:00Z',
    referenceCode: 'CUST.IN/2024/27094',
    receiptNumber: 'REC-001',
    allocations: [
      { id: 'a1', paymentId: 'p1', invoiceId: 'inv1', invoiceName: 'Invoice 1', invoiceTotal: 2000000, invoiceResidual: 0, allocatedAmount: 1500000 },
      { id: 'a2', paymentId: 'p1', invoiceId: 'inv2', invoiceName: 'Invoice 2', invoiceTotal: 1500000, invoiceResidual: 500000, allocatedAmount: 500000 },
    ],
  },
  {
    id: 'p2',
    customerId: '1',
    amount: 500000,
    method: 'bank_transfer',
    depositUsed: 0,
    cashAmount: 0,
    bankAmount: 500000,
    createdAt: '2024-12-06T00:00:00Z',
    referenceCode: 'CUST.IN/2024/27095',
    allocations: [],
  },
];

describe('CustomerProfile payment tab', () => {
  it('renders 3-column bill summary', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <CustomerProfile
            profile={mockProfile}
            appointments={[]}
            services={mockServices}
            payments={mockPayments}
            depositList={[]}
            usageHistory={[]}
            activeTab="payment"
            onBack={vi.fn()}
          />
        </AuthProvider>
      </MemoryRouter>
    );

    // Total service cost = 3,500,000
    // Amount paid = 3,500,000 - 1,000,000 = 2,500,000 (but payments only sum to 2M; however calculation uses totalCost - outstanding)
    expect(screen.getByText('profileSection.totalCost').closest('div')?.textContent).toContain('3.500.000 ₫');
    expect(screen.getByText('Đã thanh toán').closest('div')?.textContent).toContain('2.500.000 ₫');
    expect(screen.getByText('Còn nợ').closest('div')?.textContent).toContain('1.000.000 ₫');
  });

  it('shows referenceCode as primary identifier in payment history', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <CustomerProfile
            profile={mockProfile}
            appointments={[]}
            services={mockServices}
            payments={mockPayments}
            depositList={[]}
            usageHistory={[]}
            activeTab="payment"
            onBack={vi.fn()}
          />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('CUST.IN/2024/27094')).toBeInTheDocument();
    expect(screen.getByText('CUST.IN/2024/27095')).toBeInTheDocument();
  });

  it('shows receiptNumber as secondary when both referenceCode and receiptNumber exist', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <CustomerProfile
            profile={mockProfile}
            appointments={[]}
            services={mockServices}
            payments={mockPayments}
            depositList={[]}
            usageHistory={[]}
            activeTab="payment"
            onBack={vi.fn()}
          />
        </AuthProvider>
      </MemoryRouter>
    );

    // p1 has both referenceCode and receiptNumber; both should be visible
    expect(screen.getByText('CUST.IN/2024/27094')).toBeInTheDocument();
    expect(screen.getByText('REC-001')).toBeInTheDocument();
  });
});

import { screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { AuthProvider } from '@/contexts/AuthContext';
import { renderWithProviders } from '@/test/test-utils';
import { CustomerProfile } from './CustomerProfile';
import type { CustomerProfileData } from '@/hooks/useCustomerProfile';
import type { PaymentWithAllocations } from '@/hooks/useCustomerPayments';
import type { CustomerService } from '@/types/customer';

const authMock = vi.hoisted(() => ({
  hasPermission: vi.fn((_permission: string) => true),
}));

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: any }) => children,
  useAuth: () => ({
    user: null,
    permissions: null,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    hasPermission: authMock.hasPermission,
    hasLocationAccess: vi.fn(() => true),
  }),
}));

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
  beforeEach(() => {
    authMock.hasPermission.mockImplementation((_permission: string) => true);
  });

  it('renders 3-column bill summary', () => {
    renderWithProviders(
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
    );

    // Total service cost = 3,500,000
    // Amount paid = 3,500,000 - 1,000,000 = 2,500,000 (but payments only sum to 2M; however calculation uses totalCost - outstanding)
    expect(screen.getByText('profileSection.totalCost').closest('div')?.textContent).toContain('3.500.000 ₫');
    expect(screen.getByText('thanhTon').closest('div')?.textContent).toContain('2.500.000 ₫');
    expect(screen.getByText('cnN').closest('div')?.textContent).toContain('1.000.000 ₫');
  });

  it('shows referenceCode as primary identifier in payment history', () => {
    renderWithProviders(
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
    );

    expect(screen.getByText('CUST.IN/2024/27094')).toBeInTheDocument();
    expect(screen.getByText('CUST.IN/2024/27095')).toBeInTheDocument();
  });

  it('shows receiptNumber as secondary when both referenceCode and receiptNumber exist', () => {
    renderWithProviders(
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
    );

    // p1 has both referenceCode and receiptNumber; both should be visible
    expect(screen.getByText('CUST.IN/2024/27094')).toBeInTheDocument();
    expect(screen.getByText('REC-001')).toBeInTheDocument();
  });

  it('allocates service-row payments to the parent sale order id', async () => {
    const onMakePayment = vi.fn();
    const serviceLine: CustomerService = {
      id: 'line-s057144',
      orderId: 'order-so57144',
      orderName: 'SO57144',
      date: '2026-02-11',
      service: 'Niềng răng',
      doctor: 'Dr A',
      cost: 1000000,
      paidAmount: 500000,
      residual: 500000,
      status: 'active',
      tooth: 'manual',
      notes: '',
    };

    renderWithProviders(
      <AuthProvider>
        <CustomerProfile
          profile={mockProfile}
          appointments={[]}
          services={[serviceLine]}
          payments={[]}
          depositList={[]}
          usageHistory={[]}
          activeTab="records"
          onBack={vi.fn()}
          onMakePayment={onMakePayment}
        />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /pay 500\.000 ₫/ }));
    const inputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(inputs[1], { target: { value: '500000' } });
    fireEvent.click(screen.getByRole('button', { name: /ghiNhnThanhTon 500\.000 ₫/ }));

    await waitFor(() => expect(onMakePayment).toHaveBeenCalledTimes(1));
    expect(onMakePayment.mock.calls[0][0].allocations[0].invoiceId).toBe('order-so57144');
  });

  it('hides pay actions when payment.add is missing', () => {
    authMock.hasPermission.mockImplementation((permission: string) => permission !== 'payment.add');
    const onMakePayment = vi.fn();
    const serviceLine: CustomerService = {
      id: 'line-s057144',
      orderId: 'order-so57144',
      orderName: 'SO57144',
      date: '2026-02-11',
      service: 'Niềng răng',
      doctor: 'Dr A',
      cost: 1000000,
      paidAmount: 500000,
      residual: 500000,
      status: 'active',
      tooth: 'manual',
      notes: '',
    };

    renderWithProviders(
      <AuthProvider>
        <CustomerProfile
          profile={mockProfile}
          appointments={[]}
          services={[serviceLine]}
          payments={[]}
          depositList={[]}
          usageHistory={[]}
          activeTab="records"
          onBack={vi.fn()}
          onMakePayment={onMakePayment}
        />
      </AuthProvider>
    );

    expect(screen.queryByRole('button', { name: /pay 500\.000 ₫/ })).not.toBeInTheDocument();
  });

  it('hides payment delete controls when payment.void is missing', () => {
    authMock.hasPermission.mockImplementation((permission: string) => permission !== 'payment.void');

    renderWithProviders(
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
          onDeletePayment={vi.fn()}
        />
      </AuthProvider>
    );

    expect(screen.queryByTitle(/deletePayment|Xóa thanh toán/)).not.toBeInTheDocument();
  });

  it('confirms before deleting a service row', async () => {
    const onDeleteService = vi.fn().mockResolvedValue(undefined);

    renderWithProviders(
      <AuthProvider>
        <CustomerProfile
          profile={mockProfile}
          appointments={[]}
          services={mockServices}
          payments={[]}
          depositList={[]}
          usageHistory={[]}
          activeTab="records"
          onBack={vi.fn()}
          onDeleteService={onDeleteService}
        />
      </AuthProvider>
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'deleteTreatment' })[0]);

    expect(screen.getByText('deleteTreatment')).toBeInTheDocument();
    expect(screen.getAllByText('Cleaning')).toHaveLength(2);
    expect(onDeleteService).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'confirmDeleteTreatment' }));

    await waitFor(() => expect(onDeleteService).toHaveBeenCalledWith('s1'));
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomerProfileContent } from './CustomerProfileContent';

vi.mock('@/components/customer', () => ({
  CustomerProfile: (props: { onDeletePayment: (id: string) => Promise<void> }) => (
    <button type="button" onClick={() => void props.onDeletePayment('payment-1')}>
      Delete payment
    </button>
  ),
}));

describe('CustomerProfileContent payment deletion', () => {
  it('refreshes visible sale-order service records after deleting a payment', async () => {
    const deletePaymentById = vi.fn().mockResolvedValue(undefined);
    const refetchPayments = vi.fn().mockResolvedValue(undefined);
    const refetchProfile = vi.fn().mockResolvedValue(undefined);
    const loadSaleOrderLines = vi.fn().mockResolvedValue(undefined);

    render(
      <CustomerProfileContent
        {...({
          profile: {},
          appointments: [],
          services: [],
          activeTab: 'records',
          onTabChange: vi.fn(),
          onBack: vi.fn(),
          canEditCustomers: true,
          openEditForm: vi.fn(),
          selectedCustomerId: 'customer-1',
          hookProfile: { name: 'Customer One' },
          setDeleteDialog: vi.fn(),
          deletePaymentById,
          refetchPayments,
          refetchProfile,
          loadSaleOrderLines,
          updateServiceStatus: vi.fn(),
        } as any)}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete payment' }));

    await waitFor(() => expect(deletePaymentById).toHaveBeenCalledWith('payment-1'));
    expect(refetchPayments).toHaveBeenCalledTimes(1);
    expect(refetchProfile).toHaveBeenCalledTimes(1);
    expect(loadSaleOrderLines).toHaveBeenCalledTimes(1);
  });
});

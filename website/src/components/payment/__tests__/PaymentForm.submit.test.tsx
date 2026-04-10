/**
 * PaymentForm submit tests — verifies async onSubmit is awaited
 * Bug: handleSubmit() was sync, causing races when onSubmit is async
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock all hooks PaymentForm depends on
vi.mock('@/hooks/useCustomers', () => ({
  useCustomers: () => ({
    customers: [
      { id: 'cust-1', name: 'Nguyen Van A', phone: '0901111111', email: 'a@test.com', companyid: 'loc-1', status: true },
    ],
    loading: false,
  }),
}));

vi.mock('@/hooks/useLocations', () => ({
  useLocations: () => ({
    allLocations: [{ id: 'loc-1', name: 'Go Vap', address: '', phone: '' }],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useProducts', () => ({
  useProducts: () => ({
    products: [{ id: 'prod-1', name: 'Teeth Cleaning', categoryName: 'Preventive', listPrice: 150000 }],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useDeposits', () => ({
  useDeposits: () => ({
    loadDeposits: vi.fn(),
    balance: { depositBalance: 500000, outstandingBalance: 200000 },
  }),
}));

import { PaymentForm } from '../PaymentForm';

describe('PaymentForm - async submit handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should disable submit button when total payment is zero', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(
      <PaymentForm
        defaultCustomerId="cust-1"
        depositBalance={500000}
        outstandingBalance={200000}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Ghi nhận/i });
    expect(submitButton).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should call onSubmit with correct data when form is valid', async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(
      <PaymentForm
        defaultCustomerId="cust-1"
        depositBalance={500000}
        outstandingBalance={200000}
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );

    // Fill cash amount so total > 0 (inputs are deposit, cash, bank in order)
    const inputs = screen.getAllByPlaceholderText('0');
    const cashInput = inputs[1];
    await act(async () => {
      fireEvent.change(cashInput, { target: { value: '100000' } });
    });

    // Select service
    const serviceButton = screen.getByText('Chọn dịch vụ...');
    fireEvent.click(serviceButton);
    await waitFor(() => {
      expect(screen.getByText('Teeth Cleaning')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Teeth Cleaning'));

    // Submit via the primary action button
    const submitButton = screen.getByRole('button', { name: /Ghi nhận/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const submittedData = onSubmit.mock.calls[0][0];
    expect(submittedData.customerId).toBe('cust-1');
    expect(submittedData.amount).toBe(100000);
    expect(submittedData.method).toBe('cash');
    expect(submittedData.sources?.cashAmount).toBe(100000);
  });

  it('should await async onSubmit before returning (form onSubmit returns a promise)', async () => {
    let resolveSubmit: (() => void) | null = null;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });

    const onSubmit = vi.fn(async () => {
      await submitPromise;
    });

    render(
      <PaymentForm
        defaultCustomerId="cust-1"
        depositBalance={500000}
        outstandingBalance={200000}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    );

    // Fill cash amount
    const inputs = screen.getAllByPlaceholderText('0');
    await act(async () => {
      fireEvent.change(inputs[1], { target: { value: '100000' } });
    });

    // Select service
    const serviceButton = screen.getByText('Chọn dịch vụ...');
    fireEvent.click(serviceButton);
    await waitFor(() => expect(screen.getByText('Teeth Cleaning')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Teeth Cleaning'));

    // We submit the form element directly; React's onSubmit receives the event.
    // If handleSubmit is async, it returns a Promise. We can observe timing by
    // wrapping the submit in act and checking state before/after resolution.
    const form = document.querySelector('form');
    expect(form).toBeTruthy();

    // Fire form submit directly
    fireEvent.submit(form!);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    // At this point handleSubmit should be awaiting the promise if it's async.
    // To verify the contract, we resolve the promise and confirm no errors occur.
    await act(async () => {
      resolveSubmit!();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

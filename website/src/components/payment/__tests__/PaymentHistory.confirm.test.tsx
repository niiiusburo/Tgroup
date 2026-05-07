/**
 * PaymentHistory — confirm/unconfirm button behavior and permission gating
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import '@testing-library/jest-dom/vitest';
import { PaymentHistory } from '../PaymentHistory';
import type { PaymentRecord } from '@/data/mockPayment';

// ─── Mock AuthContext ───────────────────────────────────────────────────────

let mockHasPermission = vi.fn(() => true);

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: mockHasPermission }),
}));

// ─── Shared fixtures ────────────────────────────────────────────────────────

const BASE_PAYMENT: PaymentRecord = {
  id: 'pay-1',
  customerId: 'cust-1',
  customerName: 'Nguyễn Văn A',
  customerPhone: '0901111111',
  recordId: 'so-123',
  recordType: 'saleorder',
  recordName: 'SO-2024-001',
  amount: 1_000_000,
  method: 'cash',
  status: 'completed',
  date: '2026-05-01',
  locationName: 'Tấm Dentist Gò Vấp',
  notes: '',
  receiptNumber: 'RCP-001',
  isFullPayment: true,
  createdBy: 'emp-1',
};

const CONFIRMED_PAYMENT: PaymentRecord = {
  ...BASE_PAYMENT,
  id: 'pay-2',
  status: 'confirmed',
  confirmedAt: '2026-05-02T10:00:00.000Z',
  confirmedBy: 'emp-2',
  confirmedByName: 'Dr. Lê',
  confirmationNotes: 'Verified by bank slip',
};

const SALE_ORDER_PAYMENT: PaymentRecord = {
  ...BASE_PAYMENT,
  id: 'so-123',
  status: 'completed',
  createdBy: undefined,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderHistory(props: Partial<React.ComponentProps<typeof PaymentHistory>> = {}) {
  const onConfirm = vi.fn();
  const result = renderWithProviders(
    <PaymentHistory
      payments={[BASE_PAYMENT]}
      loading={false}
      onConfirm={onConfirm}
      confirmLoading={null}
      {...props}
    />
  );
  return { ...result, onConfirm };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PaymentHistory — confirmation UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  // ── 1. Confirm button visibility ───────────────────────────────────────────
  it('shows confirm button for unconfirmed canonical payment when user has permission', () => {
    renderHistory();
    expect(screen.getByRole('button', { name: /confirmPayment/i })).toBeInTheDocument();
  });

  it('hides confirm button when user lacks payment.confirm permission', () => {
    mockHasPermission.mockReturnValue(false);
    renderHistory();
    expect(screen.queryByRole('button', { name: /confirmPayment/i })).not.toBeInTheDocument();
  });

  it('hides confirm button when onConfirm is not provided', () => {
    renderHistory({ onConfirm: undefined });
    expect(screen.queryByRole('button', { name: /confirmPayment/i })).not.toBeInTheDocument();
  });

  it('does NOT show confirm button for sale-order rows (no createdBy)', () => {
    renderHistory({ payments: [SALE_ORDER_PAYMENT] });
    expect(screen.queryByRole('button', { name: /confirmPayment/i })).not.toBeInTheDocument();
  });

  // ── 2. Unconfirm button visibility ─────────────────────────────────────────
  it('shows unconfirm button for confirmed payment when user has permission', () => {
    renderHistory({ payments: [CONFIRMED_PAYMENT] });
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('hides unconfirm button when user lacks permission', () => {
    mockHasPermission.mockReturnValue(false);
    renderHistory({ payments: [CONFIRMED_PAYMENT] });
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  // ── 3. Confirmed badge for viewers without permission ──────────────────────
  it('shows confirmed badge for confirmed payment even without permission', () => {
    mockHasPermission.mockReturnValue(false);
    renderHistory({ payments: [CONFIRMED_PAYMENT] });
    expect(screen.getByText('confirmed')).toBeInTheDocument();
  });

  // ── 4. Confirmation metadata display ───────────────────────────────────────
  it('shows confirmation date and confirmer name', () => {
    renderHistory({ payments: [CONFIRMED_PAYMENT] });
    expect(screen.getByText(/Dr\. Lê/)).toBeInTheDocument();
    expect(screen.getByText(/5\/2\/2026/)).toBeInTheDocument();
  });

  it('shows confirmation notes when present', () => {
    renderHistory({ payments: [CONFIRMED_PAYMENT] });
    expect(screen.getByText(/Verified by bank slip/)).toBeInTheDocument();
  });

  // ── 5. Interaction ─────────────────────────────────────────────────────────
  it('opens confirm modal when confirm button is clicked', () => {
    renderHistory();
    fireEvent.click(screen.getByRole('button', { name: /confirmPayment/i }));
    expect(screen.getByPlaceholderText(/enterNotePlaceholder/i)).toBeInTheDocument();
  });

  it('calls onConfirm with true and notes when modal is submitted', async () => {
    const { onConfirm } = renderHistory();
    fireEvent.click(screen.getByRole('button', { name: /confirmPayment/i }));

    const textarea = screen.getByPlaceholderText(/enterNotePlaceholder/i);
    fireEvent.change(textarea, { target: { value: 'Bank verified' } });

    fireEvent.click(screen.getByRole('button', { name: /confirmPayment/i }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('pay-1', true, 'Bank verified');
    });
  });

  it('calls onConfirm with false when unconfirm button is clicked', async () => {
    const { onConfirm } = renderHistory({ payments: [CONFIRMED_PAYMENT] });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('pay-2', false, undefined);
    });
  });

  // ── 6. Loading state ───────────────────────────────────────────────────────
  it('disables confirm button while loading', () => {
    renderHistory({ confirmLoading: 'pay-1' });
    expect(screen.getByRole('button', { name: /confirmPayment/i })).toBeDisabled();
  });

  // ── 7. Edge cases ──────────────────────────────────────────────────────────
  it('renders empty state when no payments', () => {
    renderHistory({ payments: [] });
    expect(screen.getByText(/noPaymentRecords/i)).toBeInTheDocument();
  });

  it('renders loading state', () => {
    renderHistory({ loading: true });
    expect(screen.getByText(/Loading payments/i)).toBeInTheDocument();
  });
});

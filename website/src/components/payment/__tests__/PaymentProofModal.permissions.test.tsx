import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { PaymentProofModal } from '../PaymentProofModal';

let allowConfirm = true;
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    hasPermission: () => allowConfirm,
  }),
}));

vi.mock('@/lib/api/payments', () => ({
  fetchPaymentById: vi.fn(async () => ({
    id: 'pay-1',
    customerId: 'cust-1',
    amount: 1000,
    method: 'cash',
    createdAt: '2026-05-08',
    proof: {
      id: 'proof-1',
      proofImageBase64: 'data:image/png;base64,AAAA',
      qrDescription: null,
      confirmedAt: null,
      confirmedBy: null,
    },
  })),
  confirmPaymentProof: vi.fn(async () => ({
    success: true,
    proofId: 'proof-1',
    alreadyConfirmed: false,
  })),
}));

describe('PaymentProofModal permission gating', () => {
  beforeEach(() => {
    allowConfirm = true;
  });

  it('shows confirm button when user has payment.confirm', async () => {
    render(<PaymentProofModal paymentId="pay-1" isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'confirmReceipt' })).toBeInTheDocument();
    });
  });

  it('hides confirm button when user lacks payment.confirm', async () => {
    allowConfirm = false;
    render(<PaymentProofModal paymentId="pay-1" isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'confirmReceipt' })).toBeNull();
    });
  });
});


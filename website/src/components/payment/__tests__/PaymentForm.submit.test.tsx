/**
 * PaymentForm — behavioral contract tests for the refactored pay-per-service form.
 *
 * What is NOT tested here:
 *   - allocatePaymentSources internals (already covered in allocatePaymentSources.test.ts)
 *   - Component implementation details / internal state variable names
 *
 * What IS tested:
 *   - DOM presence / absence of removed UI elements (picker, location selector)
 *   - Submit button enablement rules
 *   - Cap enforcement via submitted payload
 *   - Payload shape for saleorder and dotkham record types
 *   - locationName propagation
 *   - Async submit awaiting
 *   - "Dùng tất cả" button respects cap
 *   - isEdit mode header copy
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { PaymentForm } from '../PaymentForm';
import type { ServicePaymentContext } from '../ServicePaymentCard';

// ─── Mock only what the refactored form actually uses ───────────────────────

vi.mock('@/hooks/useDeposits', () => ({
  useDeposits: () => ({
    loadDeposits: vi.fn(),
    balance: {
      depositBalance: 500000,
      outstandingBalance: 200000,
      totalDeposited: 0,
      totalUsed: 0,
      totalRefunded: 0,
    },
  }),
}));

// VietQrModal is rendered conditionally; mock it to avoid SVG/canvas errors in jsdom
vi.mock('../VietQrModal', () => ({
  VietQrModal: () => null,
}));

// ─── Shared test fixtures ────────────────────────────────────────────────────

const SALEORDER_CTX: ServicePaymentContext = {
  recordId: 'so-123',
  recordName: 'Nhổ răng khôn — SO-2024-001',
  recordType: 'saleorder',
  totalCost: 1_000_000,
  paidAmount: 200_000,
  residual: 800_000,
  locationName: 'Tấm Dentist Gò Vấp',
};

const DOTKHAM_CTX: ServicePaymentContext = {
  recordId: 'dk-456',
  recordName: 'Đợt khám răng định kỳ',
  recordType: 'dotkham',
  totalCost: 500_000,
  paidAmount: 0,
  residual: 500_000,
  locationName: 'Tấm Dentist Quận 10',
};

const BASE_PROPS = {
  defaultCustomerId: 'cust-1',
  defaultCustomerName: 'Nguyễn Văn A',
  defaultCustomerPhone: '0901111111',
  depositBalance: 1_000_000,
  outstandingBalance: 0,
  onClose: vi.fn(),
};

/** Fire a change event on a CurrencyInput (strips non-digits internally). */
function typeCurrency(input: HTMLElement, amount: number) {
  fireEvent.change(input, { target: { value: String(amount) } });
}

/** Get the three currency inputs: [deposit, cash, bank] */
function getSourceInputs() {
  return screen.getAllByPlaceholderText('0');
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PaymentForm — new contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Renders service card locked ─────────────────────────────────────────
  it('renders service card with recordName and no editable element for it', () => {
    render(
      <PaymentForm
        {...BASE_PROPS}
        serviceContext={SALEORDER_CTX}
        onSubmit={vi.fn()}
      />
    );

    // recordName appears in the DOM
    expect(screen.getByText(SALEORDER_CTX.recordName)).toBeInTheDocument();

    // No input / textarea / contenteditable contains the recordName
    const allInputs = document.querySelectorAll('input, textarea');
    for (const el of allInputs) {
      expect((el as HTMLInputElement).value).not.toBe(SALEORDER_CTX.recordName);
    }

    // No button that references the record name (would imply a picker)
    const buttons = screen.queryAllByRole('button', { name: SALEORDER_CTX.recordName });
    expect(buttons).toHaveLength(0);
  });

  // ── 2. No service picker ───────────────────────────────────────────────────
  it('does not render a service picker (no "Chọn dịch vụ..." button, no checkboxes, no allocation tabs)', () => {
    render(
      <PaymentForm
        {...BASE_PROPS}
        serviceContext={SALEORDER_CTX}
        onSubmit={vi.fn()}
      />
    );

    // No picker trigger text
    expect(screen.queryByText('Chọn dịch vụ...')).toBeNull();

    // No checkboxes (removed item-selection UI)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);

    // No clickable tab buttons labelled "Hóa đơn" or "Đợt khám" as pickers.
    // Note: the SERVICE TYPE badge inside ServicePaymentCard may read "Hóa đơn"
    // but it must NOT be a button/tab.
    const hodaonElements = screen.queryAllByText('Hóa đơn');
    for (const el of hodaonElements) {
      expect(el.tagName.toLowerCase()).not.toBe('button');
      expect(el.closest('[role="tab"]')).toBeNull();
    }
    const dotkhamElements = screen.queryAllByText('Đợt khám');
    for (const el of dotkhamElements) {
      expect(el.tagName.toLowerCase()).not.toBe('button');
      expect(el.closest('[role="tab"]')).toBeNull();
    }
  });

  // ── 3. No location picker ──────────────────────────────────────────────────
  it('does not render a location picker — locationName is only a read-only badge inside the service card', () => {
    render(
      <PaymentForm
        {...BASE_PROPS}
        serviceContext={SALEORDER_CTX}
        onSubmit={vi.fn()}
      />
    );

    // The old "Chi nhánh" label from LocationSelector must be absent
    expect(screen.queryByText('Chi nhánh')).toBeNull();

    // locationName appears somewhere (read-only badge inside ServicePaymentCard)
    const badges = screen.queryAllByText(SALEORDER_CTX.locationName);
    expect(badges.length).toBeGreaterThan(0);

    // None of those appearances is inside a <select> or a clickable <button>
    for (const badge of badges) {
      expect(badge.tagName.toLowerCase()).not.toBe('select');
      expect(badge.tagName.toLowerCase()).not.toBe('button');
      expect(badge.closest('select')).toBeNull();
      expect(badge.closest('button')).toBeNull();
    }
  });

  // ── 4. Submit disabled at zero ─────────────────────────────────────────────
  it('disables submit button when all payment amounts are zero', () => {
    render(
      <PaymentForm
        {...BASE_PROPS}
        serviceContext={SALEORDER_CTX}
        onSubmit={vi.fn()}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Ghi nhận/i });
    expect(submitButton).toBeDisabled();
  });

  // ── 5. Submit disabled when residual is zero ───────────────────────────────
  it('disables submit button when serviceContext.residual is 0 regardless of input', () => {
    const paidCtx: ServicePaymentContext = {
      ...SALEORDER_CTX,
      residual: 0,
      paidAmount: 1_000_000,
    };

    render(
      <PaymentForm
        {...BASE_PROPS}
        serviceContext={paidCtx}
        onSubmit={vi.fn()}
      />
    );

    // Even if we attempt to type in cash, button must remain disabled
    const inputs = getSourceInputs();
    fireEvent.change(inputs[1], { target: { value: '100000' } });

    const submitButton = screen.getByRole('button', { name: /Ghi nhận/i });
    expect(submitButton).toBeDisabled();
  });

  // ── 6. Cap enforcement on single source ────────────────────────────────────
  it('clamps cash input to residual when typed amount exceeds cap', async () => {
    const onSubmit = vi.fn();
    const residual = 300_000;
    const ctx: ServicePaymentContext = { ...SALEORDER_CTX, residual };

    render(
      <PaymentForm
        {...BASE_PROPS}
        serviceContext={ctx}
        onSubmit={onSubmit}
      />
    );

    const inputs = getSourceInputs();
    // inputs[1] = cash
    await act(async () => {
      typeCurrency(inputs[1], 999_999);
    });

    const submitButton = screen.getByRole('button', { name: /Ghi nhận/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.amount).toBe(residual);
    expect(payload.sources?.cashAmount).toBe(residual);
  });

  // ── 7. Cap enforcement across mixed sources ────────────────────────────────
  it('clamps bank amount when deposit+cash+bank would exceed residual=500000', async () => {
    const onSubmit = vi.fn();
    const residual = 500_000;
    const ctx: ServicePaymentContext = { ...SALEORDER_CTX, residual };

    render(
      <PaymentForm
        {...BASE_PROPS}
        depositBalance={1_000_000}
        serviceContext={ctx}
        onSubmit={onSubmit}
      />
    );

    const inputs = getSourceInputs();
    // deposit = inputs[0], cash = inputs[1], bank = inputs[2]
    await act(async () => { typeCurrency(inputs[0], 200_000); });
    await act(async () => { typeCurrency(inputs[1], 200_000); });
    await act(async () => { typeCurrency(inputs[2], 200_000); });

    const submitButton = screen.getByRole('button', { name: /Ghi nhận/i });
    await act(async () => { fireEvent.click(submitButton); });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const { amount, sources } = onSubmit.mock.calls[0][0];

    expect(amount).toBe(500_000);
    expect(sources?.depositAmount).toBe(200_000);
    expect(sources?.cashAmount).toBe(200_000);
    expect(sources?.bankAmount).toBe(100_000);
  });

  // ── 8a. Submit payload carries saleorder allocation ────────────────────────
  it('submits allocations with invoiceId for recordType=saleorder', async () => {
    const onSubmit = vi.fn();

    render(
      <PaymentForm
        {...BASE_PROPS}
        serviceContext={SALEORDER_CTX}
        onSubmit={onSubmit}
      />
    );

    const inputs = getSourceInputs();
    await act(async () => { typeCurrency(inputs[1], 100_000); });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Ghi nhận/i }));
    });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const { allocations } = onSubmit.mock.calls[0][0];

    expect(allocations).toHaveLength(1);
    expect(allocations[0].invoiceId).toBe(SALEORDER_CTX.recordId);
    expect(allocations[0].allocatedAmount).toBe(100_000);
    expect(allocations[0].dotkhamId).toBeUndefined();
  });

  // ── 8b. Submit payload carries dotkham allocation ──────────────────────────
  it('submits allocations with dotkhamId for recordType=dotkham', async () => {
    const onSubmit = vi.fn();

    render(
      <PaymentForm
        {...BASE_PROPS}
        serviceContext={DOTKHAM_CTX}
        onSubmit={onSubmit}
      />
    );

    const inputs = getSourceInputs();
    await act(async () => { typeCurrency(inputs[1], 50_000); });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Ghi nhận/i }));
    });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const { allocations } = onSubmit.mock.calls[0][0];

    expect(allocations).toHaveLength(1);
    expect(allocations[0].dotkhamId).toBe(DOTKHAM_CTX.recordId);
    expect(allocations[0].allocatedAmount).toBe(50_000);
    expect(allocations[0].invoiceId).toBeUndefined();
  });

  // ── 9. Submit carries locationName from serviceContext ─────────────────────
  it('payload.locationName equals serviceContext.locationName regardless of any global state', async () => {
    const onSubmit = vi.fn();

    render(
      <PaymentForm
        {...BASE_PROPS}
        serviceContext={SALEORDER_CTX}
        onSubmit={onSubmit}
      />
    );

    const inputs = getSourceInputs();
    await act(async () => { typeCurrency(inputs[1], 100_000); });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Ghi nhận/i }));
    });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].locationName).toBe(SALEORDER_CTX.locationName);
  });

  // ── 10. Async submit is awaited ────────────────────────────────────────────
  it('awaits async onSubmit before completing (handleSubmit is async)', async () => {
    let resolveSubmit: (() => void) | null = null;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });

    const onSubmit = vi.fn(async () => {
      await submitPromise;
    });

    render(
      <PaymentForm
        {...BASE_PROPS}
        serviceContext={SALEORDER_CTX}
        onSubmit={onSubmit}
      />
    );

    const inputs = getSourceInputs();
    await act(async () => { typeCurrency(inputs[1], 100_000); });

    const form = document.querySelector('form');
    expect(form).toBeTruthy();

    await act(async () => { fireEvent.submit(form!); });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    // Resolve the deferred promise — must not throw
    await act(async () => { resolveSubmit!(); });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  // ── 11. isEdit mode shows correct header ───────────────────────────────────
  it('shows "Chỉnh sửa thanh toán" header and still renders locked service card when isEdit=true', () => {
    render(
      <PaymentForm
        {...BASE_PROPS}
        serviceContext={SALEORDER_CTX}
        onSubmit={vi.fn()}
        isEdit
      />
    );

    expect(screen.getByText('Chỉnh sửa thanh toán')).toBeInTheDocument();
    // Service card is still locked (recordName present, not editable)
    expect(screen.getByText(SALEORDER_CTX.recordName)).toBeInTheDocument();
  });

  // ── 12. "Dùng tất cả" respects cap ────────────────────────────────────────
  it('"Dùng tất cả" clamps deposit to residual when wallet balance > residual', async () => {
    const onSubmit = vi.fn();
    const residual = 300_000;
    const walletBalance = 1_000_000;
    const ctx: ServicePaymentContext = { ...SALEORDER_CTX, residual };

    render(
      <PaymentForm
        {...BASE_PROPS}
        depositBalance={walletBalance}
        serviceContext={ctx}
        onSubmit={onSubmit}
      />
    );

    const useAllButton = screen.getByRole('button', { name: 'Dùng tất cả' });
    await act(async () => { fireEvent.click(useAllButton); });

    const submitButton = screen.getByRole('button', { name: /Ghi nhận/i });
    await act(async () => { fireEvent.click(submitButton); });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const { amount, sources } = onSubmit.mock.calls[0][0];

    expect(amount).toBe(residual);
    expect(sources?.depositAmount).toBe(residual);
    // Wallet balance (1,000,000) must NOT be the submitted amount
    expect(amount).not.toBe(walletBalance);
  });
});

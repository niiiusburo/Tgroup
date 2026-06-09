import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import i18n from '@/i18n';
import CtvDiscountLanding from './CtvDiscountLanding';


vi.mock('@/components/ctv/CtvDiscountVoucherCard', () => ({
  CtvDiscountVoucherCard: ({ code }: { code: string }) => (
    <div data-testid="voucher-card">Voucher {code}</div>
  ),
}));

const discountApiMocks = vi.hoisted(() => ({
  fetchCtvDiscountLanding: vi.fn(),
  checkExistingFanCode: vi.fn(),
  generateFanDiscountCode: vi.fn(),
}));

vi.mock('@/lib/api/discountCodes', () => ({
  fetchCtvDiscountLanding: discountApiMocks.fetchCtvDiscountLanding,
  checkExistingFanCode: discountApiMocks.checkExistingFanCode,
  generateFanDiscountCode: discountApiMocks.generateFanDiscountCode,
  buildStaffVerifyDiscountUrl: (code: string) => `/verify-discount?code=${code}`,
}));

function renderLanding(shortCode = 'CTV-333333') {
  return render(
    <MemoryRouter initialEntries={[`/ctv/discount/${shortCode}`]}>
      <Routes>
        <Route path="/ctv/discount/:shortCode" element={<CtvDiscountLanding />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('CtvDiscountLanding', () => {
  beforeAll(async () => {
    if (!i18n.isInitialized) {
      await new Promise<void>((resolve) => {
        i18n.on('initialized', () => resolve());
      });
    }
    await i18n.changeLanguage('vi');
  });

  beforeEach(() => {
    discountApiMocks.fetchCtvDiscountLanding.mockReset();
    discountApiMocks.checkExistingFanCode.mockReset();
    discountApiMocks.generateFanDiscountCode.mockReset();
    discountApiMocks.fetchCtvDiscountLanding.mockResolvedValue({
      success: true,
      ctv: {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'CTV Test Leaf',
        shortCode: 'CTV-333333',
        isLive: false,
        discountValue: 10,
        discountType: 'percent',
        expiryDays: 30,
      },
    });
    discountApiMocks.checkExistingFanCode.mockResolvedValue({
      hasCode: false,
      success: true,
      code: '',
      isExisting: false,
      discountValue: 10,
      discountType: 'percent',
    });
    discountApiMocks.generateFanDiscountCode.mockResolvedValue({
      success: true,
      code: 'LEAF-A1B2C3',
      isExisting: false,
      discountValue: 10,
      discountType: 'percent',
      ctvName: 'CTV Test Leaf',
      message: 'ok',
    });
  });

  it('loads CTV preview and shows claim CTA before code exists', async () => {
    renderLanding();
    await waitFor(() => {
      expect(screen.getByText(/CTV Test Leaf/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /nhận mã giảm giá/i })).toBeInTheDocument();
    expect(screen.queryByTestId('voucher-card')).not.toBeInTheDocument();
  });

  it('shows voucher QR card after fan claims a code', async () => {
    const user = userEvent.setup();
    renderLanding();
    const claimButton = await screen.findByRole('button', { name: /nhận mã giảm giá/i });
    await user.click(claimButton);
    expect(await screen.findByTestId('voucher-card')).toHaveTextContent('LEAF-A1B2C3');
    expect(discountApiMocks.generateFanDiscountCode).toHaveBeenCalledWith(
      '33333333-3333-4333-8333-333333333333'
    );
  });

  it('reuses an existing visitor code without forcing claim again', async () => {
    discountApiMocks.checkExistingFanCode.mockResolvedValue({
      hasCode: true,
      success: true,
      code: 'LEAF-EXIST1',
      isExisting: true,
      discountValue: 10,
      discountType: 'percent',
      ctvName: 'CTV Test Leaf',
      message: 'existing',
    });
    renderLanding();
    expect(await screen.findByTestId('voucher-card')).toHaveTextContent('LEAF-EXIST1');
  });
});
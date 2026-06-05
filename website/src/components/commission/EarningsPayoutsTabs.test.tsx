/**
 * EarningsPayoutsTabs Tests
 * Ensures Earnings and Payouts tabs default LOB filter to current business unit
 * @crossref:tests[EarningsPayoutsTabs LOB sync]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { EarningsTab, PayoutsTab } from './EarningsPayoutsTabs';
import type { BusinessUnitContextValue } from '@/contexts/BusinessUnitContext';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

// Mock API calls
const mockEarnings = {
  items: [
    {
      id: 'e1',
      recipient_name: 'CTV 1',
      recipient_partner_id: 'p1',
      client_name: 'Client 1',
      client_id: 'c1',
      service_line_id: 'line-1',
      product_name: 'Service A',
      lob: 'cosmetic' as const,
      level: 1,
      amount: 100000,
      status: 'pending',
    },
  ],
  total: 1,
};

const mockPayouts = {
  items: [
    {
      id: 'payout1',
      cycle_label: 'Cycle 1',
      lob: 'cosmetic' as const,
      earnings_count: 5,
      total_amount: 500000,
      paid_at: '2024-05-01',
      receipt_url: null,
    },
  ],
  total: 1,
};

vi.mock('@/lib/api/commission', () => ({
  fetchEarnings: vi.fn(),
  fetchPayouts: vi.fn(),
  createPayout: vi.fn(),
  uploadPayoutReceipt: vi.fn(),
  updatePayoutReceipt: vi.fn(),
}));

vi.mock('@/lib/api/core', () => ({
  ApiError: class ApiError extends Error {
    constructor(message: string) {
      super(message);
    }
  },
  getUploadUrl: (url: string) => url,
}));

vi.mock('@/components/calendar/ExportDateRangeModal', () => ({
  ExportDateRangeModal: () => null,
}));

// Mock BusinessUnitContext
vi.mock('@/contexts/BusinessUnitContext', () => ({
  useBusinessUnitOptional: vi.fn(),
  useBusinessUnit: vi.fn(() => ({ currentLOB: 'dental' })),
}));

import { fetchEarnings, fetchPayouts } from '@/lib/api/commission';
import { useBusinessUnitOptional } from '@/contexts/BusinessUnitContext';

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('EarningsPayoutsTabs LOB Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const fetchEarningsMock = fetchEarnings as any;
    const fetchPayoutsMock = fetchPayouts as any;
    fetchEarningsMock.mockResolvedValue(mockEarnings);
    fetchPayoutsMock.mockResolvedValue(mockPayouts);
  });

  describe('EarningsTab', () => {
    it('should initialize and sync lob from currentLOB (cosmetic)', async () => {
      const mockBusinessUnit: BusinessUnitContextValue = {
        currentLOB: 'cosmetic',
        setCurrentLOB: vi.fn(),
        availableLOBs: ['cosmetic'],
        isMultiLOBUser: false,
        isCosmeticEnabled: true,
      };
      (useBusinessUnitOptional as any).mockReturnValue(mockBusinessUnit);
      const fetchEarningsMock = fetchEarnings as any;
      fetchEarningsMock.mockClear();

      renderWithRouter(<EarningsTab />);

      // First render calls with default 'dental', then useEffect updates to 'cosmetic'
      await waitFor(() => {
        const lastCall = fetchEarningsMock.mock.calls[fetchEarningsMock.mock.calls.length - 1];
        expect(lastCall?.[0]).toEqual(expect.objectContaining({ lob: 'cosmetic' }));
      });
    });

    it('should initialize and sync lob from currentLOB (dental)', async () => {
      const mockBusinessUnit: BusinessUnitContextValue = {
        currentLOB: 'dental',
        setCurrentLOB: vi.fn(),
        availableLOBs: ['dental'],
        isMultiLOBUser: false,
        isCosmeticEnabled: true,
      };
      (useBusinessUnitOptional as any).mockReturnValue(mockBusinessUnit);
      const fetchEarningsMock = fetchEarnings as any;
      fetchEarningsMock.mockClear();

      renderWithRouter(<EarningsTab />);

      await waitFor(() => {
        const lastCall = fetchEarningsMock.mock.calls[fetchEarningsMock.mock.calls.length - 1];
        expect(lastCall?.[0]).toEqual(expect.objectContaining({ lob: 'dental' }));
      });
    });

    it('should default to dental when businessUnit is null', async () => {
      (useBusinessUnitOptional as any).mockReturnValue(null);
      const fetchEarningsMock = fetchEarnings as any;
      fetchEarningsMock.mockClear();

      renderWithRouter(<EarningsTab />);

      await waitFor(() => {
        expect(fetchEarningsMock).toHaveBeenCalled();
        const lastCall = fetchEarningsMock.mock.calls[0];
        expect(lastCall?.[0]).toEqual(expect.objectContaining({ lob: 'dental' }));
      });
    });

    it('links earning clients and services back into the customer profile flow', async () => {
      const mockBusinessUnit: BusinessUnitContextValue = {
        currentLOB: 'cosmetic',
        setCurrentLOB: vi.fn(),
        availableLOBs: ['cosmetic'],
        isMultiLOBUser: false,
        isCosmeticEnabled: true,
      };
      (useBusinessUnitOptional as any).mockReturnValue(mockBusinessUnit);

      renderWithRouter(<EarningsTab />);

      const clientLinks = await screen.findAllByRole('link', { name: /Client 1/i });
      expect(clientLinks[0]).toHaveAttribute('href', '/customers/c1?tab=profile&from=commission&returnTab=earnings&lob=cosmetic');

      const serviceLinks = await screen.findAllByRole('link', { name: /Service A/i });
      expect(serviceLinks[0]).toHaveAttribute('href', '/customers/c1?tab=records&from=commission&serviceLineId=line-1&returnTab=earnings&lob=cosmetic');
    });
  });

  describe('PayoutsTab', () => {
    it('should initialize and sync lob from currentLOB (cosmetic)', async () => {
      const mockBusinessUnit: BusinessUnitContextValue = {
        currentLOB: 'cosmetic',
        setCurrentLOB: vi.fn(),
        availableLOBs: ['cosmetic'],
        isMultiLOBUser: false,
        isCosmeticEnabled: true,
      };
      (useBusinessUnitOptional as any).mockReturnValue(mockBusinessUnit);
      const fetchPayoutsMock = fetchPayouts as any;
      fetchPayoutsMock.mockClear();

      renderWithRouter(<PayoutsTab />);

      await waitFor(() => {
        const lastCall = fetchPayoutsMock.mock.calls[fetchPayoutsMock.mock.calls.length - 1];
        expect(lastCall?.[0]).toEqual(expect.objectContaining({ lob: 'cosmetic' }));
      });
    });

    it('should initialize and sync lob from currentLOB (dental)', async () => {
      const mockBusinessUnit: BusinessUnitContextValue = {
        currentLOB: 'dental',
        setCurrentLOB: vi.fn(),
        availableLOBs: ['dental'],
        isMultiLOBUser: false,
        isCosmeticEnabled: true,
      };
      (useBusinessUnitOptional as any).mockReturnValue(mockBusinessUnit);
      const fetchPayoutsMock = fetchPayouts as any;
      fetchPayoutsMock.mockClear();

      renderWithRouter(<PayoutsTab />);

      await waitFor(() => {
        const lastCall = fetchPayoutsMock.mock.calls[fetchPayoutsMock.mock.calls.length - 1];
        expect(lastCall?.[0]).toEqual(expect.objectContaining({ lob: 'dental' }));
      });
    });

    it('should default to dental when businessUnit is null', async () => {
      (useBusinessUnitOptional as any).mockReturnValue(null);
      const fetchPayoutsMock = fetchPayouts as any;
      fetchPayoutsMock.mockClear();

      renderWithRouter(<PayoutsTab />);

      await waitFor(() => {
        expect(fetchPayoutsMock).toHaveBeenCalled();
        const firstCall = fetchPayoutsMock.mock.calls[0];
        expect(firstCall?.[0]).toEqual(expect.objectContaining({ lob: 'dental' }));
      });
    });

    it('should fetch both payouts and pending earnings with same lob', async () => {
      const mockBusinessUnit: BusinessUnitContextValue = {
        currentLOB: 'cosmetic',
        setCurrentLOB: vi.fn(),
        availableLOBs: ['cosmetic'],
        isMultiLOBUser: false,
        isCosmeticEnabled: true,
      };
      (useBusinessUnitOptional as any).mockReturnValue(mockBusinessUnit);
      const fetchPayoutsMock = fetchPayouts as any;
      const fetchEarningsMock = fetchEarnings as any;
      fetchPayoutsMock.mockClear();
      fetchEarningsMock.mockClear();

      renderWithRouter(<PayoutsTab />);

      await waitFor(() => {
        // Check the last calls (after useEffect updates)
        const payoutCall = fetchPayoutsMock.mock.calls[fetchPayoutsMock.mock.calls.length - 1];
        expect(payoutCall?.[0]).toEqual(expect.objectContaining({ lob: 'cosmetic' }));

        const earningCall = fetchEarningsMock.mock.calls[fetchEarningsMock.mock.calls.length - 1];
        expect(earningCall?.[0]).toEqual(expect.objectContaining({ lob: 'cosmetic', status: 'pending' }));
      });
    });
  });
});

/**
 * NewClientsTab Tests
 * Verifies the admin CTV lead list keeps phone calling and adds profile drilldown.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { NewClientsTab } from './NewClientsTab';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      if (key === 'newClients.count') return `${vars?.count ?? 0} clients`;
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/contexts/BusinessUnitContext', () => ({
  useBusinessUnitOptional: vi.fn(() => ({
    currentLOB: 'cosmetic',
    availableLOBs: ['cosmetic'],
    isMultiLOBUser: false,
    isCosmeticEnabled: true,
    setCurrentLOB: vi.fn(),
  })),
}));

vi.mock('@/lib/api/commission', () => ({
  fetchNewClients: vi.fn(),
}));

vi.mock('@/hooks/useExport', () => ({
  useExport: () => ({
    handleDirectExport: vi.fn(),
    openPreview: vi.fn(),
    closePreview: vi.fn(),
    handleDownload: vi.fn(),
    downloading: false,
    previewOpen: false,
    previewData: null,
    loading: false,
    error: null,
  }),
}));

vi.mock('@/components/shared/ExportMenu', () => ({
  ExportMenu: () => <button type="button">export</button>,
}));

vi.mock('@/components/shared/ExportPreviewModal', () => ({
  ExportPreviewModal: () => null,
}));

vi.mock('@/components/calendar/ExportDateRangeModal', () => ({
  ExportDateRangeModal: () => null,
}));

import { fetchNewClients } from '@/lib/api/commission';

describe('NewClientsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchNewClients as any).mockResolvedValue({
      items: [
        {
          id: 'client-1',
          name: 'thuan test',
          phone: '0123123123',
          referred_at: '2026-06-01T09:00:00.000Z',
          referring_ctv_name: 'THuan Le',
          referring_ctv_phone: '0989460997',
          service_count: 1,
          service_line_count: 1,
          service_total: 4000000,
          paid_total: 1000000,
          earnings_count: 0,
          commissioned_service_line_count: 0,
          commission_total: 0,
          service_missing_ctv_count: 1,
          missing_commission: true,
          commission_status: 'missing_commission',
          lob: 'cosmetic',
        },
      ],
      totalItems: 1,
      limit: 500,
      offset: 0,
    });
  });

  it('links the client name to the profile while keeping the phone callable', async () => {
    render(
      <MemoryRouter>
        <NewClientsTab />
      </MemoryRouter>
    );

    const clientLinks = await screen.findAllByRole('link', { name: /thuan test/i });
    expect(clientLinks[0]).toHaveAttribute('href', '/customers/client-1?tab=profile&from=commission&returnTab=newClients&lob=cosmetic');

    const phoneLinks = screen.getAllByRole('link', { name: /0123123123/i });
    expect(phoneLinks[0]).toHaveAttribute('href', 'tel:0123123123');
    expect(screen.getAllByText((text) => text.includes('4,000,000') || text.includes('4.000.000'))[0]).toBeInTheDocument();
    expect(screen.getAllByText('newClients.statusMissing')[0]).toBeInTheDocument();
  });
});

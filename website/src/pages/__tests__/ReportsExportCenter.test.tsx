import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import Reports from '../Reports';

const mockNavigate = vi.fn();
const mockUseExport = vi.fn();

vi.mock('react-router-dom', () => ({
  Outlet: () => <div data-testid="report-outlet" />,
  useLocation: () => ({ pathname: '/reports/dashboard' }),
  useNavigate: () => mockNavigate,
}));

vi.mock('@/components/shared/PageHeader', () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <header>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  ),
}));

vi.mock('@/components/reports/ReportsFilters', () => ({
  ReportsFilters: () => <div data-testid="reports-filters" />,
}));

vi.mock('@/components/shared/ExportMenu', () => ({
  ExportMenu: ({ onExport }: { onExport: () => void }) => (
    <button type="button" onClick={onExport}>export-menu</button>
  ),
}));

vi.mock('@/components/shared/ExportPreviewModal', () => ({
  ExportPreviewModal: () => <div data-testid="export-preview-modal" />,
}));

vi.mock('@/hooks/useLocations', () => ({
  useLocations: () => ({
    allLocations: [],
    isLoading: false,
  }),
}));

vi.mock('@/lib/api/employees', () => ({
  fetchEmployees: vi.fn(() => new Promise(() => {})),
}));

vi.mock('@/hooks/useExport', () => ({
  useExport: (options: unknown) => mockUseExport(options),
}));

describe('Reports export center', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseExport.mockReturnValue({
      previewOpen: false,
      previewData: null,
      loading: false,
      downloading: false,
      error: null,
      openPreview: vi.fn(),
      closePreview: vi.fn(),
      handleDownload: vi.fn(),
      handleDirectExport: vi.fn(),
    });
  });

  it('lists the legacy flat revenue and deposit Excel choices', () => {
    render(<Reports />);

    const dataset = screen.getByRole('combobox');
    expect(dataset).toHaveTextContent('exportCenter.types.revenueFlat');
    expect(dataset).toHaveTextContent('exportCenter.types.depositFlat');
  });

  it('sends the selected legacy export type to the export hook', () => {
    render(<Reports />);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'revenue-flat' },
    });

    expect(mockUseExport).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'revenue-flat',
    }));

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'deposit-flat' },
    });

    expect(mockUseExport).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'deposit-flat',
    }));
  });
});

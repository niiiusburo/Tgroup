import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { ReportsDashboard } from '../ReportsDashboard';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '@/lib/api';
const mockFetch = vi.mocked(apiFetch);

// Mock framer-motion — useSpring/useTransform must return renderable values
vi.mock('framer-motion', async () => {
  const React = await import('react');
  return {
    motion: {
      div: React.forwardRef(({ children, ...props }: any, ref: any) => React.createElement('div', { ...props, ref }, children)),
      circle: React.forwardRef(({ children, ...props }: any, ref: any) => React.createElement('circle', { ...props, ref }, children)),
      span: React.forwardRef(({ children, ...props }: any, ref: any) => React.createElement('span', { ...props, ref }, children)),
    },
    useSpring: (_v: number) => ({ set: () => {} }),
    useTransform: (_: any, fn: any) => fn(0),
  };
});

const mockContext = { dateFrom: '2025-01-01', dateTo: '2025-12-31', companyId: '' };
vi.mock('react-router-dom', async () => {
  const React = await import('react');
  return {
    BrowserRouter: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useOutletContext: () => mockContext,
  };
});

const mockDashboardData = {
  revenue: { invoiced: 84070000, paid: 25770000, outstanding: 48890000, change: -38.8 },
  appointments: { total: 197, done: 150, cancelled: 2, change: 358.1 },
  customers: { newCustomers: 31 },
  trend: [
    { month: '2025-03-01T00:00:00.000Z', revenue: 10000000, invoiced: 15000000 },
  ],
};

describe('ReportsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state while fetching', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<ReportsDashboard />);
    expect(screen.getByText('Đang tải…')).toBeInTheDocument();
  });

  it('renders KPI card labels when data loads', async () => {
    mockFetch.mockResolvedValueOnce({ success: true, data: mockDashboardData });

    renderWithProviders(<ReportsDashboard />);

    await screen.findByText('Doanh thu đã thu');
    expect(screen.getByText('Tổng lịch hẹn')).toBeInTheDocument();
    expect(screen.getByText('Khách hàng mới')).toBeInTheDocument();
    // 'Outstanding' appears in KPI card and quick stats
    const outstandingElements = screen.getAllByText('Còn nợ');
    expect(outstandingElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders error state with retry when API rejects', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders(<ReportsDashboard />);

    // Use getAllByText since the error appears in both heading and paragraph
    const errorElements = await screen.findAllByText('Failed to load report');
    expect(errorElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders error state when success is false', async () => {
    mockFetch.mockResolvedValueOnce({ success: false });

    renderWithProviders(<ReportsDashboard />);

    await screen.findAllByText('Failed to load report');
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders chart section titles', async () => {
    mockFetch.mockResolvedValueOnce({ success: true, data: mockDashboardData });

    renderWithProviders(<ReportsDashboard />);

    await screen.findByText('Xu hướng doanh thu 12 tháng');
    expect(screen.getByText('Tỷ lệ lịch hẹn')).toBeInTheDocument();
  });
});

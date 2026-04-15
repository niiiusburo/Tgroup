import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
vi.mock('react-router-dom', () => ({
  useOutletContext: () => mockContext,
}));

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
    render(<ReportsDashboard />);
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('renders KPI card labels when data loads', async () => {
    mockFetch.mockResolvedValueOnce({ success: true, data: mockDashboardData });

    render(<ReportsDashboard />);

    await screen.findByText('metrics.revenueCollected');
    expect(screen.getByText('metrics.totalAppointments')).toBeInTheDocument();
    expect(screen.getByText('metrics.newCustomers')).toBeInTheDocument();
    // 'Outstanding' appears in KPI card and quick stats
    const outstandingElements = screen.getAllByText('metrics.outstanding');
    expect(outstandingElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders error state with retry when API rejects', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ReportsDashboard />);

    // Use getAllByText since the error appears in both heading and paragraph
    const errorElements = await screen.findAllByText('Failed to load report');
    expect(errorElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders error state when success is false', async () => {
    mockFetch.mockResolvedValueOnce({ success: false });

    render(<ReportsDashboard />);

    await screen.findAllByText('Failed to load report');
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders chart section titles', async () => {
    mockFetch.mockResolvedValueOnce({ success: true, data: mockDashboardData });

    render(<ReportsDashboard />);

    await screen.findByText('charts.revenueTrend12Month');
    expect(screen.getByText('charts.appointmentRates')).toBeInTheDocument();
  });
});

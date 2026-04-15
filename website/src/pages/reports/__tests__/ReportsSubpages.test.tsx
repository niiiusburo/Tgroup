/**
 * Shared test for all 8 report subpages.
 * Each test verifies: loading → success rendering, loading → error display.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportsRevenue } from '../ReportsRevenue';
import { ReportsAppointments } from '../ReportsAppointments';
import { ReportsDoctors } from '../ReportsDoctors';
import { ReportsCustomers } from '../ReportsCustomers';
import { ReportsLocations } from '../ReportsLocations';
import { ReportsServices } from '../ReportsServices';
import { ReportsEmployees } from '../ReportsEmployees';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '@/lib/api';
const mockFetch = vi.mocked(apiFetch);

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

// ─── Mock Data ───────────────────────────────────────────────────────

function getRevenueResponses() {
  return [
    { success: true, data: {
      orders: [{ state: 'sale', cnt: 29, total: 126205000, paid: 67905000, outstanding: 48890000 }],
      payments: [{ method: 'cash', status: 'posted', cnt: 71, total: 104116000 }],
    }},
    { success: true, data: [
      { month: '2025-01-01T00:00:00Z', orderCount: 5, invoiced: 20000000, paid: 15000000, outstanding: 5000000 },
    ]},
    { success: true, data: [
      { id: 'l1', name: 'Location A', orderCount: 10, invoiced: 50000000, paid: 25000000, outstanding: 20000000 },
    ]},
    { success: true, data: [
      { id: 'd1', name: 'Dr. A', orderCount: 8, invoiced: 20000000, paid: 15000000 },
    ]},
    { success: true, data: [
      { id: 'cat1', category: 'Răng sứ', lineCount: 15, revenue: 45000000 },
    ]},
  ];
}

function getApptResponses() {
  return [
    { success: true, data: {
      total: 197, done: 150, cancelled: 2,
      completionRate: '76.1', cancellationRate: '1.0', conversionRate: '45.0',
      states: [{ state: 'done', count: 150 }],
      repeatCustomers: 45, newCustomers: 80,
    }},
    { success: true, data: {
      trend: [{ week: '2025-01-06T00:00:00Z', total: 12, done: 8, cancelled: 1 }],
      peakHours: [{ hour: 9, count: 35 }],
    }},
  ];
}

function getDoctorsResponse() {
  return { success: true, data: [
    { id: 'd1', name: 'Dr. An', totalAppointments: 45, done: 40, cancelled: 2, revenue: 25000000 },
  ]};
}

function getCustomersResponse() {
  return { success: true, data: {
    total: 40, newInPeriod: 31,
    sources: [{ name: 'Google', count: 15 }],
    gender: [{ gender: 'female', count: 25 }],
    cities: [],
    topSpenders: [{ id: 'c1', name: 'User A', totalPaid: 15000000, orderCount: 5 }],
    outstanding: [],
    growth: [{ month: '2025-01-01T00:00:00Z', count: 8 }],
  }};
}

function getLocationsResponse() {
  return { success: true, data: {
    locations: [
      { id: 'l1', name: 'Location A', active: true, appointmentCount: 43, doneCount: 35, revenue: 25000000, orderCount: 10, employeeCount: 8 },
    ],
    trend: [],
  }};
}

function getServicesResponse() {
  return { success: true, data: {
    categories: [{ category: 'Răng sứ', productCount: 25, avgPrice: 3000000 }],
    revenueByCategory: [{ category: 'Răng sứ', orderCount: 20, revenue: 45000000 }],
    popularProducts: [{ name: 'Zirconia', category: 'Răng sứ', price: 3500000, orderCount: 12 }],
  }};
}

function getEmployeesResponse() {
  return { success: true, data: {
    roles: { doctors: 19, assistants: 8, receptionists: 4, total: 33 },
    byLocation: [{ location: 'Location A', count: 8, doctors: 5, assistants: 2 }],
    employees: [
      { id: 'e1', name: 'Dr. An', isdoctor: true, isassistant: false, isreceptionist: false, jobtitle: 'Bác sĩ', location: 'Location A', startworkdate: '2024-01-15', active: true },
    ],
  }};
}

// ─── Test Cases ──────────────────────────────────────────────────────

describe('Report subpages — error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const subpages = [
    { name: 'Revenue', Component: ReportsRevenue, label: 'metrics.totalInvoiced', responses: getRevenueResponses, loadingText: 'loading' },
    { name: 'Appointments', Component: ReportsAppointments, label: 'metrics.totalAppointments', responses: getApptResponses, loadingText: 'loading' },
    { name: 'Doctors', Component: ReportsDoctors, label: 'metrics.totalDoctors', responses: () => [getDoctorsResponse()], loadingText: 'loading' },
    { name: 'Customers', Component: ReportsCustomers, label: 'metrics.totalAppointments', responses: () => [getCustomersResponse()], loadingText: 'loading' },
    { name: 'Locations', Component: ReportsLocations, label: 'metrics.totalBranches', responses: () => [getLocationsResponse()], loadingText: 'loading' },
    { name: 'Services', Component: ReportsServices, label: 'metrics.categories', responses: () => [getServicesResponse()], loadingText: 'loading' },
    { name: 'Employees', Component: ReportsEmployees, label: 'metrics.totalEmployees', responses: () => [getEmployeesResponse()], loadingText: 'loading' },
  ];

  for (const { name, Component, label, responses, loadingText } of subpages) {
    describe(`${name} subpage`, () => {
      it('shows loading state', () => {
        mockFetch.mockReturnValue(new Promise(() => {}));
        render(<Component />);
        expect(screen.getByText(new RegExp(loadingText, 'i'))).toBeInTheDocument();
      });

      it('renders data when API succeeds', async () => {
        for (const resp of responses()) {
          mockFetch.mockResolvedValueOnce(resp);
        }
        render(<Component />);
        await screen.findByText(label, undefined, { timeout: 3000 });
        expect(screen.getByText(label)).toBeInTheDocument();
      });

      it('shows error state with retry when API fails', async () => {
        // Make ALL calls reject
        mockFetch.mockRejectedValue(new Error('Server error'));

        render(<Component />);
        const errorElements = await screen.findAllByText('Failed to load report', undefined, { timeout: 3000 });
        expect(errorElements.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });
  }
});

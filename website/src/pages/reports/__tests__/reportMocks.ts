import { vi } from 'vitest';

/**
 * Mock apiFetch to return controlled responses for report endpoints.
 * Usage: mockReportsApi({ '/Reports/dashboard': dashboardData })
 */
export async function mockReportsApi(responses: Record<string, unknown>) {
  const { apiFetch } = vi.mocked(await import('@/lib/api'));
  for (const [endpoint, data] of Object.entries(responses)) {
    apiFetch.mockImplementation((ep: string) => {
      if (ep === endpoint) return Promise.resolve({ success: true, data });
      return Promise.reject(new Error(`Unexpected endpoint: ${ep}`));
    });
  }
}

/**
 * Common filter context passed via Outlet context.
 */
export const mockFilters = {
  dateFrom: '2025-01-01',
  dateTo: '2025-12-31',
  companyId: '',
};

// ─── Mock Data for each subpage ─────────────────────────────────────

export const mockDashboardData = {
  revenue: { invoiced: 84070000, paid: 25770000, outstanding: 48890000, change: -38.8 },
  appointments: { total: 197, done: 150, cancelled: 2, change: 358.1 },
  customers: { newCustomers: 31 },
  trend: [
    { month: '2025-03-01T00:00:00.000Z', revenue: 10000000, invoiced: 15000000 },
    { month: '2025-04-01T00:00:00.000Z', revenue: 12000000, invoiced: 18000000 },
  ],
};

export const mockRevenueSummary = {
  orders: [
    { state: 'sale', cnt: 29, total: 126205000, paid: 67905000, outstanding: 48890000 },
    { state: 'cancel', cnt: 3, total: 3500000, paid: 0, outstanding: 3500000 },
  ],
  payments: [
    { method: 'cash', status: 'posted', cnt: 71, total: 104116000 },
    { method: 'bank', status: 'posted', cnt: 6, total: 7000000 },
    { method: 'deposit', status: 'posted', cnt: 4, total: 8110000 },
  ],
};

export const mockRevenueTrend = [
  { month: '2025-01-01T00:00:00.000Z', orderCount: 5, invoiced: 20000000, paid: 15000000, outstanding: 5000000 },
  { month: '2025-02-01T00:00:00.000Z', orderCount: 8, invoiced: 30000000, paid: 25000000, outstanding: 5000000 },
];

export const mockRevenueByLoc = [
  { id: 'loc1', name: 'Tấm Dentist Thủ Đức', orderCount: 10, invoiced: 54270000, paid: 25070000, outstanding: 27090000 },
  { id: 'loc2', name: 'Tấm Dentist Quận 3', orderCount: 11, invoiced: 24300000, paid: 700000, outstanding: 20600000 },
];

export const mockRevenueByDoc = [
  { id: 'd1', name: 'Dr. An', orderCount: 8, invoiced: 20000000, paid: 15000000 },
  { id: 'd2', name: 'Dr. Bình', orderCount: 5, invoiced: 12000000, paid: 8000000 },
];

export const mockRevenueByCat = [
  { id: 'cat1', category: 'Răng sứ', lineCount: 15, revenue: 45000000 },
  { id: 'cat2', category: 'Niềng răng', lineCount: 8, revenue: 32000000 },
];

export const mockApptSummary = {
  total: 197, done: 150, cancelled: 2,
  completionRate: '76.1',
  cancellationRate: '1.0',
  conversionRate: '45.0',
  states: [
    { state: 'done', count: 150 },
    { state: 'confirmed', count: 19 },
    { state: 'scheduled', count: 15 },
    { state: 'arrived', count: 9 },
  ],
  repeatCustomers: 45,
  newCustomers: 80,
};

export const mockApptTrend = {
  trend: [
    { week: '2025-01-06T00:00:00.000Z', total: 12, done: 8, cancelled: 1 },
    { week: '2025-01-13T00:00:00.000Z', total: 15, done: 12, cancelled: 0 },
  ],
  peakHours: [
    { hour: 9, count: 35 },
    { hour: 10, count: 42 },
    { hour: 14, count: 28 },
  ],
};

export const mockDoctorsPerf = [
  { id: 'd1', name: 'Dr. An', totalAppointments: 45, done: 40, cancelled: 2, revenue: 25000000 },
  { id: 'd2', name: 'Dr. Bình', totalAppointments: 30, done: 25, cancelled: 1, revenue: 18000000 },
];

export const mockCustomersSummary = {
  total: 40,
  newInPeriod: 31,
  sources: [
    { name: 'Google', count: 15 },
    { name: 'Facebook', count: 10 },
    { name: 'Giới thiệu', count: 8 },
  ],
  gender: [
    { gender: 'female', count: 25 },
    { gender: 'male', count: 15 },
  ],
  cities: [
    { city: 'Hồ Chí Minh', count: 30 },
    { city: 'Đồng Nai', count: 5 },
  ],
  topSpenders: [
    { id: 'c1', name: 'Nguyễn Văn A', totalPaid: 15000000, orderCount: 5 },
    { id: 'c2', name: 'Trần Thị B', totalPaid: 12000000, orderCount: 3 },
  ],
  outstanding: [
    { id: 'c3', name: 'Lê Văn C', outstanding: 5000000 },
  ],
  growth: [
    { month: '2025-01-01T00:00:00.000Z', count: 8 },
    { month: '2025-02-01T00:00:00.000Z', count: 12 },
  ],
};

export const mockLocationsComparison = {
  locations: [
    { id: 'loc1', name: 'Tấm Dentist Thủ Đức', active: true, appointmentCount: 43, doneCount: 35, revenue: 25070000, orderCount: 10, employeeCount: 8 },
    { id: 'loc2', name: 'Tấm Dentist Quận 3', active: true, appointmentCount: 53, doneCount: 40, revenue: 700000, orderCount: 11, employeeCount: 6 },
  ],
  trend: [],
};

export const mockServicesBreakdown = {
  categories: [
    { category: 'Răng sứ', productCount: 25, avgPrice: 3000000 },
    { category: 'Niềng răng', productCount: 15, avgPrice: 5000000 },
  ],
  revenueByCategory: [
    { category: 'Răng sứ', orderCount: 20, revenue: 45000000 },
    { category: 'Niềng răng', orderCount: 10, revenue: 32000000 },
  ],
  popularProducts: [
    { name: 'Răng sứ Zirconia', category: 'Răng sứ', price: 3500000, orderCount: 12 },
    { name: 'Niềng răng trong', category: 'Niềng răng', price: 5000000, orderCount: 8 },
  ],
};

export const mockEmployeesOverview = {
  roles: { doctors: 19, assistants: 8, receptionists: 4, total: 33 },
  byLocation: [
    { location: 'Tấm Dentist Thủ Đức', count: 8, doctors: 5, assistants: 2 },
    { location: 'Tấm Dentist Quận 3', count: 6, doctors: 4, assistants: 1 },
  ],
  employees: [
    { id: 'e1', name: 'Dr. An', isdoctor: true, isassistant: false, isreceptionist: false, jobtitle: 'Bác sĩ Nha khoa', location: 'Tấm Dentist Thủ Đức', startworkdate: '2024-01-15', active: true },
    { id: 'e2', name: 'Nguyễn Thị D', isdoctor: false, isassistant: true, isreceptionist: false, jobtitle: 'Phụ tá', location: 'Tấm Dentist Quận 3', startworkdate: '2024-03-01', active: true },
  ],
};

/**
 * Mock data for Locations & Branches
 * @crossref:used-in[useLocations, Locations, LocationCard, LocationDetail, LocationDashboard]
 */

export type LocationStatus = 'active' | 'renovation' | 'closed';

export interface LocationBranch {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly district: string;
  readonly phone: string;
  readonly email: string;
  readonly status: LocationStatus;
  readonly employeeCount: number;
  readonly customerCount: number;
  readonly monthlyRevenue: number;
  readonly monthlyTarget: number;
  readonly openingDate: string;
  readonly operatingHours: string;
  readonly manager: string;
}

export interface LocationRevenuePoint {
  readonly month: string;
  readonly revenue: number;
  readonly target: number;
}

export interface LocationMetrics {
  readonly locationId: string;
  readonly appointmentsToday: number;
  readonly appointmentsThisWeek: number;
  readonly newCustomersThisMonth: number;
  readonly averageRating: number;
  readonly occupancyRate: number;
  readonly revenueData: readonly LocationRevenuePoint[];
}

export const STATUS_LABELS: Record<LocationStatus, string> = {
  active: 'Active',
  renovation: 'Renovation',
  closed: 'Closed',
};

export const STATUS_STYLES: Record<LocationStatus, string> = {
  active: 'bg-green-100 text-green-700',
  renovation: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-gray-100 text-gray-500',
};

export const MOCK_LOCATION_BRANCHES: readonly LocationBranch[] = [
  {
    id: 'loc-1',
    name: 'Chi nhánh Quận 1',
    address: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
    district: 'Quận 1',
    phone: '028-3821-0001',
    email: 'quan1@tamtmv.vn',
    status: 'active',
    employeeCount: 18,
    customerCount: 1240,
    monthlyRevenue: 450,
    monthlyTarget: 500,
    openingDate: '2019-03-15',
    operatingHours: '08:00 - 20:00',
    manager: 'Nguyễn Thị Mai',
  },
  {
    id: 'loc-2',
    name: 'Chi nhánh Quận 7',
    address: '456 Nguyễn Thị Thập, Phường Tân Phú, Quận 7, TP.HCM',
    district: 'Quận 7',
    phone: '028-3771-0002',
    email: 'quan7@tamtmv.vn',
    status: 'active',
    employeeCount: 15,
    customerCount: 980,
    monthlyRevenue: 380,
    monthlyTarget: 400,
    openingDate: '2020-06-01',
    operatingHours: '08:00 - 20:00',
    manager: 'Trần Văn Hùng',
  },
  {
    id: 'loc-3',
    name: 'Chi nhánh Thủ Đức',
    address: '789 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP.HCM',
    district: 'Thủ Đức',
    phone: '028-3720-0003',
    email: 'thuduc@tamtmv.vn',
    status: 'active',
    employeeCount: 12,
    customerCount: 760,
    monthlyRevenue: 310,
    monthlyTarget: 350,
    openingDate: '2021-01-10',
    operatingHours: '08:00 - 19:30',
    manager: 'Lê Thị Hương',
  },
  {
    id: 'loc-4',
    name: 'Chi nhánh Bình Thạnh',
    address: '321 Xô Viết Nghệ Tĩnh, Phường 25, Bình Thạnh, TP.HCM',
    district: 'Bình Thạnh',
    phone: '028-3551-0004',
    email: 'binhthanh@tamtmv.vn',
    status: 'active',
    employeeCount: 14,
    customerCount: 890,
    monthlyRevenue: 360,
    monthlyTarget: 380,
    openingDate: '2020-09-20',
    operatingHours: '08:00 - 20:00',
    manager: 'Phạm Quốc Bảo',
  },
  {
    id: 'loc-5',
    name: 'Chi nhánh Tân Bình',
    address: '55 Hoàng Văn Thụ, Phường 8, Tân Bình, TP.HCM',
    district: 'Tân Bình',
    phone: '028-3844-0005',
    email: 'tanbinh@tamtmv.vn',
    status: 'active',
    employeeCount: 10,
    customerCount: 620,
    monthlyRevenue: 280,
    monthlyTarget: 320,
    openingDate: '2022-04-15',
    operatingHours: '08:30 - 19:30',
    manager: 'Hoàng Minh Tuấn',
  },
  {
    id: 'loc-6',
    name: 'Chi nhánh Gò Vấp',
    address: '88 Quang Trung, Phường 10, Gò Vấp, TP.HCM',
    district: 'Gò Vấp',
    phone: '028-3894-0006',
    email: 'govap@tamtmv.vn',
    status: 'active',
    employeeCount: 11,
    customerCount: 710,
    monthlyRevenue: 295,
    monthlyTarget: 330,
    openingDate: '2021-11-01',
    operatingHours: '08:00 - 19:00',
    manager: 'Võ Thị Lan',
  },
  {
    id: 'loc-7',
    name: 'Chi nhánh Phú Nhuận',
    address: '200 Phan Xích Long, Phường 2, Phú Nhuận, TP.HCM',
    district: 'Phú Nhuận',
    phone: '028-3995-0007',
    email: 'phunhuan@tamtmv.vn',
    status: 'renovation',
    employeeCount: 8,
    customerCount: 540,
    monthlyRevenue: 0,
    monthlyTarget: 280,
    openingDate: '2022-08-10',
    operatingHours: 'Tạm đóng cửa',
    manager: 'Đào Thị Ngọc',
  },
  {
    id: 'loc-8',
    name: 'Chi nhánh Quận 3',
    address: '150 Nguyễn Đình Chiểu, Phường 6, Quận 3, TP.HCM',
    district: 'Quận 3',
    phone: '028-3930-0008',
    email: 'quan3@tamtmv.vn',
    status: 'active',
    employeeCount: 16,
    customerCount: 1050,
    monthlyRevenue: 420,
    monthlyTarget: 450,
    openingDate: '2019-11-05',
    operatingHours: '08:00 - 20:00',
    manager: 'Bùi Thanh Tùng',
  },
] as const;

export const MOCK_LOCATION_METRICS: readonly LocationMetrics[] = [
  {
    locationId: 'loc-1',
    appointmentsToday: 24,
    appointmentsThisWeek: 142,
    newCustomersThisMonth: 38,
    averageRating: 4.8,
    occupancyRate: 92,
    revenueData: [
      { month: 'Jan', revenue: 380, target: 450 },
      { month: 'Feb', revenue: 410, target: 450 },
      { month: 'Mar', revenue: 435, target: 470 },
      { month: 'Apr', revenue: 420, target: 470 },
      { month: 'May', revenue: 460, target: 490 },
      { month: 'Jun', revenue: 450, target: 500 },
    ],
  },
  {
    locationId: 'loc-2',
    appointmentsToday: 18,
    appointmentsThisWeek: 108,
    newCustomersThisMonth: 25,
    averageRating: 4.6,
    occupancyRate: 85,
    revenueData: [
      { month: 'Jan', revenue: 320, target: 370 },
      { month: 'Feb', revenue: 340, target: 370 },
      { month: 'Mar', revenue: 360, target: 380 },
      { month: 'Apr', revenue: 350, target: 380 },
      { month: 'May', revenue: 375, target: 390 },
      { month: 'Jun', revenue: 380, target: 400 },
    ],
  },
  {
    locationId: 'loc-3',
    appointmentsToday: 14,
    appointmentsThisWeek: 82,
    newCustomersThisMonth: 20,
    averageRating: 4.7,
    occupancyRate: 78,
    revenueData: [
      { month: 'Jan', revenue: 260, target: 310 },
      { month: 'Feb', revenue: 275, target: 310 },
      { month: 'Mar', revenue: 290, target: 330 },
      { month: 'Apr', revenue: 285, target: 330 },
      { month: 'May', revenue: 305, target: 340 },
      { month: 'Jun', revenue: 310, target: 350 },
    ],
  },
  {
    locationId: 'loc-4',
    appointmentsToday: 16,
    appointmentsThisWeek: 96,
    newCustomersThisMonth: 22,
    averageRating: 4.5,
    occupancyRate: 82,
    revenueData: [
      { month: 'Jan', revenue: 300, target: 350 },
      { month: 'Feb', revenue: 320, target: 350 },
      { month: 'Mar', revenue: 340, target: 360 },
      { month: 'Apr', revenue: 335, target: 360 },
      { month: 'May', revenue: 355, target: 370 },
      { month: 'Jun', revenue: 360, target: 380 },
    ],
  },
  {
    locationId: 'loc-5',
    appointmentsToday: 10,
    appointmentsThisWeek: 62,
    newCustomersThisMonth: 15,
    averageRating: 4.4,
    occupancyRate: 72,
    revenueData: [
      { month: 'Jan', revenue: 230, target: 290 },
      { month: 'Feb', revenue: 245, target: 290 },
      { month: 'Mar', revenue: 260, target: 300 },
      { month: 'Apr', revenue: 255, target: 300 },
      { month: 'May', revenue: 275, target: 310 },
      { month: 'Jun', revenue: 280, target: 320 },
    ],
  },
  {
    locationId: 'loc-6',
    appointmentsToday: 12,
    appointmentsThisWeek: 74,
    newCustomersThisMonth: 18,
    averageRating: 4.6,
    occupancyRate: 76,
    revenueData: [
      { month: 'Jan', revenue: 250, target: 300 },
      { month: 'Feb', revenue: 265, target: 300 },
      { month: 'Mar', revenue: 280, target: 310 },
      { month: 'Apr', revenue: 275, target: 310 },
      { month: 'May', revenue: 290, target: 320 },
      { month: 'Jun', revenue: 295, target: 330 },
    ],
  },
  {
    locationId: 'loc-7',
    appointmentsToday: 0,
    appointmentsThisWeek: 0,
    newCustomersThisMonth: 0,
    averageRating: 4.3,
    occupancyRate: 0,
    revenueData: [
      { month: 'Jan', revenue: 200, target: 260 },
      { month: 'Feb', revenue: 210, target: 260 },
      { month: 'Mar', revenue: 180, target: 270 },
      { month: 'Apr', revenue: 0, target: 0 },
      { month: 'May', revenue: 0, target: 0 },
      { month: 'Jun', revenue: 0, target: 0 },
    ],
  },
  {
    locationId: 'loc-8',
    appointmentsToday: 20,
    appointmentsThisWeek: 118,
    newCustomersThisMonth: 30,
    averageRating: 4.7,
    occupancyRate: 88,
    revenueData: [
      { month: 'Jan', revenue: 360, target: 410 },
      { month: 'Feb', revenue: 380, target: 410 },
      { month: 'Mar', revenue: 400, target: 430 },
      { month: 'Apr', revenue: 395, target: 430 },
      { month: 'May', revenue: 415, target: 440 },
      { month: 'Jun', revenue: 420, target: 450 },
    ],
  },
] as const;

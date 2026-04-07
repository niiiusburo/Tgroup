/**
 * Mock data for Overview Dashboard
 * @crossref:used-in[Overview, hooks]
 */

export interface Notification {
  readonly id: string;
  readonly type: 'appointment' | 'payment' | 'system' | 'customer';
  readonly title: string;
  readonly message: string;
  readonly timestamp: string;
  readonly read: boolean;
}

export interface RevenueDataPoint {
  readonly month: string;
  readonly revenue: number;
  readonly target: number;
}

export interface LocationOption {
  readonly id: string;
  readonly name: string;
}

export const MOCK_LOCATIONS: readonly LocationOption[] = [
  { id: 'all', name: 'All Locations' },
  { id: 'loc-1', name: 'District 1 Branch' },
  { id: 'loc-2', name: 'District 7 Branch' },
  { id: 'loc-3', name: 'Thu Duc Branch' },
  { id: 'loc-4', name: 'Binh Thanh Branch' },
];

export const MOCK_NOTIFICATIONS: readonly Notification[] = [
  {
    id: 'n1',
    type: 'appointment',
    title: 'Upcoming Appointment',
    message: 'Nguyen Van A has an appointment at 2:00 PM today',
    timestamp: '10 min ago',
    read: false,
  },
  {
    id: 'n2',
    type: 'payment',
    title: 'Payment Received',
    message: 'Payment of 5,000,000 VND received from Tran Thi B',
    timestamp: '25 min ago',
    read: false,
  },
  {
    id: 'n3',
    type: 'customer',
    title: 'New Customer',
    message: 'Le Van C registered as a new customer',
    timestamp: '1 hour ago',
    read: true,
  },
  {
    id: 'n4',
    type: 'system',
    title: 'System Update',
    message: 'Monthly reports are ready for review',
    timestamp: '2 hours ago',
    read: true,
  },
  {
    id: 'n5',
    type: 'appointment',
    title: 'Appointment Cancelled',
    message: 'Pham Thi D cancelled their 4:30 PM appointment',
    timestamp: '3 hours ago',
    read: true,
  },
];

export const MOCK_REVENUE_DATA: readonly RevenueDataPoint[] = [
  { month: 'Jan', revenue: 120, target: 150 },
  { month: 'Feb', revenue: 145, target: 150 },
  { month: 'Mar', revenue: 162, target: 160 },
  { month: 'Apr', revenue: 138, target: 160 },
  { month: 'May', revenue: 175, target: 170 },
  { month: 'Jun', revenue: 190, target: 170 },
  { month: 'Jul', revenue: 168, target: 180 },
  { month: 'Aug', revenue: 195, target: 180 },
  { month: 'Sep', revenue: 210, target: 190 },
  { month: 'Oct', revenue: 185, target: 190 },
  { month: 'Nov', revenue: 220, target: 200 },
  { month: 'Dec', revenue: 245, target: 200 },
];

export const QUICK_ACTIONS = [
  { id: 'new-appointment', label: 'New Appointment', icon: 'CalendarPlus' },
  { id: 'add-customer', label: 'Add Customer', icon: 'UserPlus' },
  { id: 'record-payment', label: 'Record Payment', icon: 'CreditCard' },
  { id: 'new-service', label: 'New Service', icon: 'Stethoscope' },
  { id: 'view-reports', label: 'View Reports', icon: 'BarChart3' },
] as const;

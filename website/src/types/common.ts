/**
 * Common type definitions shared across modules
 * @crossref:used-in[Overview, hooks, various components]
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

// Quick actions for dashboard
export interface QuickAction {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
}

export const QUICK_ACTIONS: readonly QuickAction[] = [
  { id: 'new-appointment', label: 'New Appointment', icon: 'CalendarPlus' },
  { id: 'add-customer', label: 'Add Customer', icon: 'UserPlus' },
  { id: 'record-payment', label: 'Record Payment', icon: 'CreditCard' },
  { id: 'new-service', label: 'New Service', icon: 'Stethoscope' },
  { id: 'view-reports', label: 'View Reports', icon: 'BarChart3' },
] as const;

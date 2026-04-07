/**
 * TDental Shared Constants
 * @crossref:used-in[ALL_COMPONENTS]
 * @crossref:used-in[ROUTES, PAGES, UI_COMPONENTS]
 */

/**
 * Status colors for various entity states
 * Used throughout the application for consistent status indication
 */
export const STATUS_COLORS = {
  /** Active/Confirmed/Success states */
  active: '#10B981',
  /** Pending/Waiting/Processing states */
  pending: '#F59E0B',
  /** Cancelled/Failed/Error states */
  cancelled: '#EF4444',
  /** Completed/Done states */
  completed: '#3B82F6',
  /** Inactive/Archived states */
  inactive: '#6B7280',
  /** Draft/Temporary states */
  draft: '#9CA3AF',
} as const;

/**
 * Appointment-specific status colors
 */
export const APPOINTMENT_STATUS_COLORS = {
  scheduled: '#3B82F6',
  confirmed: '#10B981',
  'in-progress': '#8B5CF6',
  completed: '#0EA5E9',
  cancelled: '#EF4444',
  'no-show': '#F59E0B',
} as const;

/**
 * Payment status colors
 */
export const PAYMENT_STATUS_COLORS = {
  paid: '#10B981',
  pending: '#F59E0B',
  overdue: '#EF4444',
  refunded: '#6B7280',
  partial: '#8B5CF6',
} as const;

/**
 * Dental clinic theme colors
 * Primary brand colors and supporting palette
 */
export const THEME_COLORS = {
  /** Primary orange brand color */
  primary: {
    DEFAULT: '#F97316',
    light: '#FED7AA',
    lighter: '#FFF7ED',
    dark: '#EA580C',
  },
  /** Supporting dental-themed colors */
  dental: {
    blue: '#0EA5E9',
    green: '#10B981',
    purple: '#8B5CF6',
    pink: '#EC4899',
    yellow: '#F59E0B',
    teal: '#14B8A6',
  },
  /** UI surface colors */
  surface: {
    white: '#FFFFFF',
    background: '#F3F4F6',
    sidebar: '#1F2937',
    card: '#FFFFFF',
    border: '#E5E7EB',
  },
  /** Text colors */
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    muted: '#9CA3AF',
    inverse: '#FFFFFF',
  },
} as const;

/**
 * Route paths for navigation
 */
export const ROUTES = {
  OVERVIEW: '/',
  CALENDAR: '/calendar',
  CUSTOMERS: '/customers',
  APPOINTMENTS: '/appointments',
  SERVICES: '/services',
  PAYMENT: '/payment',
  EMPLOYEES: '/employees',
  LOCATIONS: '/locations',
  WEBSITE: '/website',
  SETTINGS: '/settings',
  RELATIONSHIPS: '/relationships',
} as const;

/**
 * Navigation items for sidebar/menu
 */
export const NAVIGATION_ITEMS = [
  { path: ROUTES.OVERVIEW, label: 'Overview', icon: 'LayoutDashboard' },
  { path: ROUTES.CALENDAR, label: 'Calendar', icon: 'Calendar' },
  { path: ROUTES.CUSTOMERS, label: 'Customers', icon: 'Users' },
  { path: ROUTES.APPOINTMENTS, label: 'Appointments', icon: 'CalendarCheck' },
  { path: ROUTES.SERVICES, label: 'Services', icon: 'Stethoscope' },
  { path: ROUTES.PAYMENT, label: 'Payment', icon: 'CreditCard' },
  { path: ROUTES.EMPLOYEES, label: 'Employees', icon: 'UserCog' },
  { path: ROUTES.LOCATIONS, label: 'Locations', icon: 'MapPin' },
  { path: ROUTES.WEBSITE, label: 'Website', icon: 'Globe' },
  { path: ROUTES.SETTINGS, label: 'Settings', icon: 'Settings' },
  { path: ROUTES.RELATIONSHIPS, label: 'Relationships', icon: 'Network' },
] as const;

/**
 * Common time slots for appointments
 */
export const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
] as const;

/**
 * Week days for scheduling
 */
export const WEEK_DAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
] as const;

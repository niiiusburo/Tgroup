/**
 * TG Clinic Shared Constants
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
} as const

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
} as const

/**
 * Payment status colors
 */
export const PAYMENT_STATUS_COLORS = {
  paid: '#10B981',
  pending: '#F59E0B',
  overdue: '#EF4444',
  refunded: '#6B7280',
  partial: '#8B5CF6',
} as const

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
} as const

/**
 * Route paths for navigation
 */
export const ROUTES = {
  OVERVIEW: '/',
  CALENDAR: '/calendar',
  CUSTOMERS: '/customers',
  EMPLOYEES: '/employees',
  LOCATIONS: '/locations',
  SERVICES: '/services',
  WEBSITE: '/website',
  SETTINGS: '/settings',
  RELATIONSHIPS: '/relationships',
  COMMISSION: '/commission',
  REPORTS: '/reports',
  REPORTS_DASHBOARD: '/reports/dashboard',
  REPORTS_REVENUE: '/reports/revenue',
  REPORTS_APPOINTMENTS: '/reports/appointments',
  REPORTS_DOCTORS: '/reports/doctors',
  REPORTS_CUSTOMERS: '/reports/customers',
  REPORTS_LOCATIONS: '/reports/locations',
  REPORTS_SERVICES: '/reports/services',
  REPORTS_EMPLOYEES: '/reports/employees',
  NOTIFICATIONS: '/notifications',
  PERMISSIONS: '/permissions',
  PAYMENT: '/payment',
  FEEDBACK: '/feedback',
} as const

/**
 * Navigation item type with optional children for hierarchical menus
 */
export interface NavigationItem {
  path: string
  label: string
  icon: string
  count?: string
  isPremium?: boolean
  children?: NavigationItem[]
}

/**
  * Navigation items for sidebar/menu with hierarchical structure
  * @design-ref:submenu-indentation - Children items are indented under parents
  * @design-ref:count-badges - Shows completion counts like "0/5"
  */
export const NAVIGATION_ITEMS: NavigationItem[] = [
  { path: ROUTES.OVERVIEW, label: 'overview', icon: 'BarChart3' },
  { path: ROUTES.CALENDAR, label: 'calendar', icon: 'Calendar' },
  { path: ROUTES.CUSTOMERS, label: 'customers', icon: 'Users' },
  {
    path: '/clinic',
    label: 'clinic',
    icon: 'Stethoscope',
    children: [
      { path: ROUTES.SERVICES, label: 'services', icon: 'Stethoscope' },
      { path: ROUTES.WEBSITE, label: 'serviceCatalog', icon: 'Stethoscope', count: '228' },
      { path: ROUTES.PAYMENT, label: 'paymentPlans', icon: 'CreditCard' },
    ],
  },
  {
    path: '/team',
    label: 'team',
    icon: 'UserCog',
    children: [
      { path: ROUTES.EMPLOYEES, label: 'employees', icon: 'UserCog' },
      { path: ROUTES.COMMISSION, label: 'commission', icon: 'Percent', isPremium: true },
      { path: ROUTES.LOCATIONS, label: 'locations', icon: 'MapPin' },
    ],
  },
  {
    path: '/reports',
    label: 'reports',
    icon: 'BarChart3',
    children: [
      { path: ROUTES.REPORTS_DASHBOARD, label: 'dashboard', icon: 'LayoutDashboard' },
      { path: ROUTES.REPORTS_REVENUE, label: 'revenue', icon: 'CreditCard' },
      { path: ROUTES.REPORTS_APPOINTMENTS, label: 'appointments', icon: 'Calendar' },
      { path: ROUTES.REPORTS_DOCTORS, label: 'doctors', icon: 'Stethoscope' },
      { path: ROUTES.REPORTS_CUSTOMERS, label: 'customers', icon: 'Users' },
      { path: ROUTES.REPORTS_LOCATIONS, label: 'locations', icon: 'MapPin' },
      { path: ROUTES.REPORTS_SERVICES, label: 'services', icon: 'FolderOpen' },
      { path: ROUTES.REPORTS_EMPLOYEES, label: 'employees', icon: 'UserCog' },
    ],
  },
  {
    path: '/admin',
    label: 'admin',
    icon: 'Settings',
    children: [
      { path: ROUTES.SETTINGS, label: 'settings', icon: 'Settings' },
      { path: ROUTES.FEEDBACK, label: 'feedback', icon: 'MessageSquare' },
      { path: ROUTES.PERMISSIONS, label: 'permissions', icon: 'Shield' },
      { path: ROUTES.RELATIONSHIPS, label: 'relationships', icon: 'Users' },
      { path: ROUTES.NOTIFICATIONS, label: 'notifications', icon: 'Bell' },
    ],
  },
] as const

/**
 * Appointment type definitions with color coding
 * @crossref:used-in[Calendar, Appointments, Overview]
 */
export type AppointmentType =
  | 'cleaning'
  | 'consultation'
  | 'treatment'
  | 'surgery'
  | 'orthodontics'
  | 'cosmetic'
  | 'emergency'

export const APPOINTMENT_TYPE_COLORS: Record<
  AppointmentType,
  { bg: string; border: string; text: string; dot: string }
> = {
  cleaning:     { bg: 'bg-teal-50',    border: 'border-teal-200',    text: 'text-teal-700',    dot: 'bg-teal-500' },
  consultation: { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  treatment:    { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  surgery:      { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     dot: 'bg-red-500' },
  orthodontics: { bg: 'bg-purple-50',  border: 'border-purple-200',  text: 'text-purple-700',  dot: 'bg-purple-500' },
  cosmetic:     { bg: 'bg-pink-50',    border: 'border-pink-200',    text: 'text-pink-700',    dot: 'bg-pink-500' },
  emergency:    { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  dot: 'bg-orange-500' },
} as const

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  cleaning: 'calendar.appointmentTypes.cleaning',
  consultation: 'calendar.appointmentTypes.consultation',
  treatment: 'calendar.appointmentTypes.treatment',
  surgery: 'calendar.appointmentTypes.surgery',
  orthodontics: 'calendar.appointmentTypes.orthodontics',
  cosmetic: 'calendar.appointmentTypes.cosmetic',
  emergency: 'calendar.appointmentTypes.emergency',
} as const

/**
 * Common time slots for appointments
 */
export const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
] as const

/**
 * Week days for scheduling
 */
export const WEEK_DAYS = [
  'common.days.monday', 'common.days.tuesday', 'common.days.wednesday', 'common.days.thursday', 'common.days.friday', 'common.days.saturday', 'common.days.sunday',
] as const

/**
 * ═══════════════════════════════════════════════════════════════════════
 * APPOINTMENT CARD COLORS — SINGLE SOURCE OF TRUTH
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Color codes 0-7 come from the database (appointments.color field).
 * ALL components displaying appointment colors MUST use this constant.
 * DO NOT create local color maps — import from here instead.
 *
 * This ensures the EditAppointmentModal color picker, TodayAppointments
 * cards, WeekView, DayView, and AppointmentCard all show the SAME color
 * for the same code.
 * ═══════════════════════════════════════════════════════════════════════
 */
export interface AppointmentCardColor {
  /** Tailwind bg class for card background */
  bg: string
  /** Tailwind bg class for highlighted/gradient card */
  bgHighlight: string
  /** Tailwind border class */
  border: string
  /** Tailwind text class */
  text: string
  /** Tailwind dot/accent class */
  dot: string
  /** Human-readable label (Vietnamese) */
  label: string
  /** Tailwind gradient classes for color picker preview dots */
  previewGradient: string
}

export const APPOINTMENT_CARD_COLORS: Record<string, AppointmentCardColor> = {
  '0': {
    bg: 'bg-blue-50',
    bgHighlight: 'bg-gradient-to-br from-blue-100 to-blue-200',
    border: 'border-blue-200',
    text: 'text-blue-700',
    dot: 'border-l-blue-400',
    label: 'common:colors.blue',
    previewGradient: 'from-blue-200 to-blue-300',
  },
  '1': {
    bg: 'bg-emerald-50',
    bgHighlight: 'bg-gradient-to-br from-emerald-100 to-emerald-200',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    dot: 'border-l-emerald-400',
    label: 'common:colors.green',
    previewGradient: 'from-emerald-200 to-emerald-300',
  },
  '2': {
    bg: 'bg-amber-50',
    bgHighlight: 'bg-gradient-to-br from-amber-100 to-amber-200',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: 'border-l-amber-400',
    label: 'common:colors.orange',
    previewGradient: 'from-amber-200 to-amber-300',
  },
  '3': {
    bg: 'bg-red-50',
    bgHighlight: 'bg-gradient-to-br from-red-100 to-red-200',
    border: 'border-red-200',
    text: 'text-red-700',
    dot: 'border-l-red-400',
    label: 'common:colors.red',
    previewGradient: 'from-red-200 to-red-300',
  },
  '4': {
    bg: 'bg-violet-50',
    bgHighlight: 'bg-gradient-to-br from-violet-100 to-violet-200',
    border: 'border-violet-200',
    text: 'text-violet-700',
    dot: 'border-l-violet-400',
    label: 'common:colors.purple',
    previewGradient: 'from-violet-200 to-violet-300',
  },
  '5': {
    bg: 'bg-pink-50',
    bgHighlight: 'bg-gradient-to-br from-pink-100 to-pink-200',
    border: 'border-pink-200',
    text: 'text-pink-700',
    dot: 'border-l-pink-400',
    label: 'common:colors.pink',
    previewGradient: 'from-pink-200 to-pink-300',
  },
  '6': {
    bg: 'bg-cyan-50',
    bgHighlight: 'bg-gradient-to-br from-cyan-100 to-cyan-200',
    border: 'border-cyan-200',
    text: 'text-cyan-700',
    dot: 'border-l-cyan-400',
    label: 'common:colors.cyan',
    previewGradient: 'from-cyan-200 to-cyan-300',
  },
  '7': {
    bg: 'bg-lime-50',
    bgHighlight: 'bg-gradient-to-br from-lime-100 to-lime-200',
    border: 'border-lime-200',
    text: 'text-lime-700',
    dot: 'border-l-lime-400',
    label: 'common:colors.lime',
    previewGradient: 'from-lime-200 to-lime-300',
  },
} as const

/** Default color when no color code is set */
export const DEFAULT_APPOINTMENT_COLOR = APPOINTMENT_CARD_COLORS['0']

/**
 * ═══════════════════════════════════════════════════════════════════════
 * APPOINTMENT STATUS OPTIONS — SINGLE SOURCE OF TRUTH
 * ═══════════════════════════════════════════════════════════════════════
 *
 * 3 states only: scheduled, arrived, cancelled.
 * Used by AppointmentForm, EditAppointmentModal, AppointmentDetailsModal.
 * DO NOT create local STATUS_OPTIONS arrays — import from here.
 * ═══════════════════════════════════════════════════════════════════════
 */
export const APPOINTMENT_STATUS_OPTIONS = [
  { value: 'scheduled', label: 'status.scheduled', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'arrived', label: 'status.arrived', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'cancelled', label: 'status.cancelled', color: 'bg-red-100 text-red-700 border-red-200' },
] as const

/** i18n status keys for ALL appointment states (including extended ones). */
export const APPOINTMENT_STATUS_I18N_KEYS: Record<string, string> = {
  scheduled: 'status.scheduled',
  arrived: 'status.arrived',
  confirmed: 'status.confirmed',
  'in-progress': 'status.inProgress',
  completed: 'status.completed',
  cancelled: 'status.cancelled',
}

/** @deprecated Use APPOINTMENT_STATUS_I18N_KEYS with t() instead */
export const APPOINTMENT_STATUS_LABELS_VI: Record<string, string> = {
  scheduled: 'Đang hẹn',
  arrived: 'Đã đến',
  confirmed: 'Đã xác nhận',
  'in-progress': 'Đang khám',
  completed: 'Hoàn tất',
  cancelled: 'Hủy hẹn',
}

export type AppointmentStatus = typeof APPOINTMENT_STATUS_OPTIONS[number]['value']
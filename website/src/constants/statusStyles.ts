/**
 * Status-related constants (labels, styles, colors)
 * Extracted from mock files for centralized style management
 */

export const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  'in-progress': 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  renovation: 'Renovation',
  closed: 'Closed',
  'planned': 'Planned',
  'missed': 'Missed',
  'paid': 'Paid',
  'upcoming': 'Upcoming',
  'overdue': 'Overdue',
  'defaulted': 'Defaulted',
  'draft': 'Draft',
  'not-arrived': 'Not Arrived',
  arrived: 'Arrived',
  waiting: 'Waiting',
  done: 'Done',
  published: 'Published',
  archived: 'Archived',
  failed: 'Failed',
  refunded: 'Refunded',
};

/**
 * Unified status style entry.
 * - `color`: Tailwind bg/text classes for an inline status pill (formerly STATUS_STYLES).
 * - `badgeClass`: Tailwind classes including a border, for badge-style status (formerly STATUS_BADGE_STYLES).
 * - `dotClass`: Tailwind bg class for a status-dot indicator (formerly STATUS_DOT_COLORS).
 *
 * Empty string means that sub-style was not defined for this status in the
 * legacy split maps — consumers fall back to `` via optional chaining.
 */
export interface StatusStyleEntry {
  readonly color: string;
  readonly badgeClass: string;
  readonly dotClass: string;
}

/**
 * Single source of truth for status-related Tailwind styling.
 * Replaces the former STATUS_STYLES / STATUS_BADGE_STYLES / STATUS_DOT_COLORS maps.
 */
export const STATUS_STYLE_MAP: Record<string, StatusStyleEntry> = {
  active:          { color: 'bg-green-100 text-green-700',   badgeClass: 'bg-green-100 text-green-700 border-green-200',   dotClass: 'bg-green-500' },
  inactive:        { color: 'bg-gray-100 text-gray-500',     badgeClass: 'bg-gray-100 text-gray-500 border-gray-200',      dotClass: 'bg-gray-400' },
  pending:         { color: 'bg-yellow-100 text-yellow-700', badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-200', dotClass: 'bg-yellow-500' },
  scheduled:       { color: 'bg-blue-100 text-blue-700',     badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',      dotClass: 'bg-blue-500' },
  confirmed:       { color: 'bg-indigo-100 text-indigo-700', badgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200', dotClass: 'bg-indigo-500' },
  'in-progress':   { color: 'bg-orange-100 text-orange-700', badgeClass: 'bg-orange-100 text-orange-700 border-orange-200', dotClass: 'bg-orange-500' },
  completed:       { color: 'bg-green-100 text-green-700',   badgeClass: 'bg-green-100 text-green-700 border-green-200',   dotClass: 'bg-green-500' },
  cancelled:       { color: 'bg-red-100 text-red-700',       badgeClass: 'bg-red-100 text-red-700 border-red-200',         dotClass: 'bg-red-500' },
  renovation:      { color: 'bg-yellow-100 text-yellow-700', badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-200', dotClass: 'bg-yellow-500' },
  closed:          { color: 'bg-gray-100 text-gray-500',     badgeClass: 'bg-gray-100 text-gray-500 border-gray-200',      dotClass: 'bg-gray-400' },
  planned:         { color: 'bg-blue-100 text-blue-700',     badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',      dotClass: '' },
  missed:          { color: 'bg-red-100 text-red-700',       badgeClass: 'bg-red-100 text-red-700 border-red-200',         dotClass: '' },
  paid:            { color: 'bg-green-100 text-green-700',   badgeClass: 'bg-green-100 text-green-700 border-green-200',   dotClass: '' },
  upcoming:        { color: 'bg-blue-100 text-blue-700',     badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',      dotClass: '' },
  overdue:         { color: 'bg-red-100 text-red-700',       badgeClass: 'bg-red-100 text-red-700 border-red-200',         dotClass: '' },
  defaulted:       { color: 'bg-red-100 text-red-700',       badgeClass: 'bg-red-100 text-red-700 border-red-200',         dotClass: '' },
  draft:           { color: 'bg-gray-100 text-gray-500',     badgeClass: 'bg-gray-100 text-gray-500 border-gray-200',      dotClass: '' },
  'not-arrived':   { color: 'bg-gray-100 text-gray-500',     badgeClass: 'bg-gray-100 text-gray-500 border-gray-200',      dotClass: 'bg-gray-400' },
  arrived:         { color: 'bg-blue-100 text-blue-700',     badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',      dotClass: 'bg-blue-500' },
  waiting:         { color: 'bg-yellow-100 text-yellow-700', badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-200', dotClass: 'bg-yellow-500' },
  'in-treatment':  { color: 'bg-orange-100 text-orange-700', badgeClass: 'bg-orange-100 text-orange-700 border-orange-200', dotClass: 'bg-orange-500' },
  done:            { color: 'bg-green-100 text-green-700',   badgeClass: 'bg-green-100 text-green-700 border-green-200',   dotClass: 'bg-green-500' },
  published:       { color: 'bg-green-100 text-green-700',   badgeClass: '',                                               dotClass: '' },
  archived:        { color: 'bg-gray-100 text-gray-500',     badgeClass: '',                                               dotClass: '' },
  failed:          { color: 'bg-red-100 text-red-700',       badgeClass: 'bg-red-100 text-red-700 border-red-200',         dotClass: '' },
  refunded:        { color: 'bg-gray-100 text-gray-500',     badgeClass: 'bg-gray-100 text-gray-500 border-gray-200',      dotClass: '' },
};

export const TIER_LABELS: Record<string, string> = {
  'super-admin': 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
  receptionist: 'Receptionist',
  assistant: 'Assistant',
};

export const TIER_STYLES: Record<string, string> = {
  'super-admin': 'bg-red-100 text-red-600',
  admin: 'bg-purple-100 text-purple-600',
  editor: 'bg-blue-100 text-blue-600',
  receptionist: 'bg-green-100 text-green-600',
  assistant: 'bg-amber-100 text-amber-600',
};

export const ROLE_LABELS: Record<string, string> = {
  'general-manager': 'roles.generalManager',
  'branch-manager': 'roles.branchManager',
  doctor: 'roles.doctor',
  'doctor-assistant': 'roles.doctorAssistant',
  assistant: 'roles.assistant',
  receptionist: 'roles.receptionist',
  'sales-staff': 'roles.salesStaff',
  'customer-service': 'roles.customerService',
  marketing: 'roles.marketing',
};

export const ROLE_STYLES: Record<string, string> = {
  'general-manager': 'bg-red-100 text-red-700',
  'branch-manager': 'bg-orange-100 text-orange-700',
  doctor: 'bg-blue-100 text-blue-700',
  'doctor-assistant': 'bg-cyan-100 text-cyan-700',
  assistant: 'bg-teal-100 text-teal-700',
  receptionist: 'bg-green-100 text-green-700',
  'sales-staff': 'bg-purple-100 text-purple-700',
  'customer-service': 'bg-pink-100 text-pink-700',
  marketing: 'bg-indigo-100 text-indigo-700',
};

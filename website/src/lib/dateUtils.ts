/**
 * Date utilities with timezone support
 * @crossref:used-in[TimezoneContext, useOverviewAppointments, useCalendarData]
 */

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

/**
 * Available timezones for the application
 * Vietnam is first as the default
 */
export const TIMEZONES: TimezoneOption[] = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Vietnam (ICT, UTC+7)', offset: '+07:00' },
  { value: 'UTC', label: 'UTC', offset: '+00:00' },
  { value: 'America/New_York', label: 'US East (ET, UTC-5/UTC-4)', offset: '-05:00' },
  { value: 'America/Los_Angeles', label: 'US West (PT, UTC-8/UTC-7)', offset: '-08:00' },
  { value: 'Europe/London', label: 'London (GMT/BST, UTC+0/UTC+1)', offset: '+00:00' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST, UTC+9)', offset: '+09:00' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT, UTC+8)', offset: '+08:00' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST, UTC+10/UTC+11)', offset: '+10:00' },
];

/**
 * Get today's date in YYYY-MM-DD format for the specified timezone
 */
export function getTodayInTimezone(timezone: string): string {
  const now = new Date();
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
  
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
}

const DEFAULT_ICT_TIMEZONE = 'Asia/Ho_Chi_Minh';
const YYYY_MM_DD_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Format a date in the specified timezone
 */
export function formatInTimezone(
  date: Date | string,
  timezone: string,
  format: string = 'yyyy-MM-dd'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(d);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
  
  // Simple format replacement
  return format
    .replace('yyyy', getPart('year'))
    .replace('MM', getPart('month'))
    .replace('dd', getPart('day'))
    .replace('HH', getPart('hour'))
    .replace('mm', getPart('minute'))
    .replace('ss', getPart('second'));
}

/**
 * Normalize any date-ish input to a clean YYYY-MM-DD string in ICT.
 * Single source of truth for form/display date handling.
 * Examples:
 *   '2026-04-18'                 => '2026-04-18'
 *   '2026-04-17T17:00:00.000Z'   => '2026-04-18' (ICT)
 *   Date instance                 => 'YYYY-MM-DD'
 *   '' | null | undefined | bad   => ''
 */
export function toISODateString(
  input: string | Date | null | undefined,
  timezone: string = DEFAULT_ICT_TIMEZONE
): string {
  if (input == null || input === '') return '';
  if (typeof input === 'string' && YYYY_MM_DD_RE.test(input)) return input;
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';
  return formatInTimezone(d, timezone, 'yyyy-MM-dd');
}

/**
 * Get start of day string in timezone
 */
export function getStartOfDayInTimezone(dateStr: string, _timezone: string): string {
  return `${dateStr}T00:00:00`;
}

/**
 * Get end of day string in timezone
 */
export function getEndOfDayInTimezone(dateStr: string, _timezone: string): string {
  return `${dateStr}T23:59:59`;
}

/**
 * Get current date-time in ISO format for specified timezone
 */
export function getNowInTimezone(timezone: string): string {
  const now = new Date();
  return formatInTimezone(now, timezone, 'yyyy-MM-ddTHH:mm:ss');
}

/**
 * Parse a date string and convert to specified timezone
 */
export function parseDateInTimezone(dateStr: string, timezone: string): Date {
  // Create date and format it in the target timezone
  const d = new Date(dateStr);
  const formatted = formatInTimezone(d, timezone, 'yyyy-MM-ddTHH:mm:ss');
  return new Date(formatted);
}

/**
 * Check if two dates are the same day in the specified timezone
 */
export function isSameDayInTimezone(
  date1: Date | string,
  date2: Date | string,
  timezone: string
): boolean {
  const d1 = formatInTimezone(date1, timezone, 'yyyy-MM-dd');
  const d2 = formatInTimezone(date2, timezone, 'yyyy-MM-dd');
  return d1 === d2;
}

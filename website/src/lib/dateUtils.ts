/**
 * Date utilities with timezone support
 * @crossref:used-in[TimezoneContext, useOverviewAppointments, useCalendarData, DatePicker, Calendar]
 *
 * All functions use Intl.DateTimeFormat for proper timezone-aware operations.
 * Default timezone is Asia/Ho_Chi_Minh (Vietnam, UTC+7).
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
 * Get date parts in the specified timezone
 */
function getDateParts(date: Date | string, timezone: string, includeTime = false) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
    options.hour12 = false;
  }
  const formatter = new Intl.DateTimeFormat('en-GB', options);
  const parts = formatter.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
}

/**
 * Get today's date in YYYY-MM-DD format for the specified timezone
 */
export function getTodayInTimezone(timezone: string): string {
  const parts = getDateParts(new Date(), timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
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
  const includeTime = format.includes('HH') || format.includes('mm') || format.includes('ss');
  const parts = getDateParts(date, timezone, includeTime);

  return format
    .replace('yyyy', parts.year)
    .replace('MM', parts.month)
    .replace('dd', parts.day)
    .replace('HH', parts.hour)
    .replace('mm', parts.minute)
    .replace('ss', parts.second);
}

/**
 * Get start of day string in timezone (YYYY-MM-DDTHH:mm:ss)
 * Returns the local start-of-day time in the target timezone.
 */
export function getStartOfDayInTimezone(dateStr: string, _timezone: string): string {
  // dateStr is already YYYY-MM-DD in the target timezone
  // We just append the local midnight
  return `${dateStr}T00:00:00`;
}

/**
 * Get end of day string in timezone (YYYY-MM-DDTHH:mm:ss)
 * Returns the local end-of-day time in the target timezone.
 */
export function getEndOfDayInTimezone(dateStr: string, _timezone: string): string {
  // dateStr is already YYYY-MM-DD in the target timezone
  return `${dateStr}T23:59:59`;
}

/**
 * Get current date-time as YYYY-MM-DDTHH:mm:ss in the specified timezone
 */
export function getNowInTimezone(timezone: string): string {
  return formatInTimezone(new Date(), timezone, 'yyyy-MM-ddTHH:mm:ss');
}

/**
 * Parse a YYYY-MM-DD date string and return a Date object representing
 * that date at midnight in the specified timezone.
 *
 * IMPORTANT: JavaScript Date objects are always in the browser's local
 * timezone internally. This function creates a Date that, when formatted
 * in the target timezone, yields the expected date.
 */
export function parseDateInTimezone(dateStr: string, timezone: string): Date {
  // Best effort: create a date from the string plus timezone offset hint
  // For Vietnam (UTC+7), we subtract 7 hours from UTC to get local midnight
  const [year, month, day] = dateStr.split('-').map(Number);

  // Create a UTC date at midnight for that date
  const utcDate = Date.UTC(year, month - 1, day, 0, 0, 0);

  // Get timezone offset in minutes for that UTC moment
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = formatter.formatToParts(new Date(utcDate));
  const tzName = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';

  // Parse offset from string like "GMT+7" or "GMT+07:00"
  const match = tzName.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
  let offsetMinutes = 0;
  if (match) {
    const sign = match[1].startsWith('-') ? -1 : 1;
    const hours = Math.abs(parseInt(match[1], 10));
    const minutes = parseInt(match[2] ?? '0', 10);
    offsetMinutes = sign * (hours * 60 + minutes);
  }

  // Adjust UTC timestamp by offset to get local midnight in target timezone
  return new Date(utcDate - offsetMinutes * 60 * 1000);
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

/**
 * Add days to a date string (YYYY-MM-DD) and return new YYYY-MM-DD in timezone
 */
export function addDaysInTimezone(dateStr: string, days: number, timezone: string): string {
  const d = parseDateInTimezone(dateStr, timezone);
  d.setDate(d.getDate() + days);
  return formatInTimezone(d, timezone, 'yyyy-MM-dd');
}

/**
 * Add months to a date string (YYYY-MM-DD) and return new YYYY-MM-DD in timezone
 */
export function addMonthsInTimezone(dateStr: string, months: number, timezone: string): string {
  const d = parseDateInTimezone(dateStr, timezone);
  d.setMonth(d.getMonth() + months);
  return formatInTimezone(d, timezone, 'yyyy-MM-dd');
}

/**
 * Get days in a month for a given YYYY-MM-DD anchor in timezone
 */
export function getDaysInMonthInTimezone(dateStr: string, timezone: string): number {
  const d = parseDateInTimezone(dateStr, timezone);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.getDate();
}

/**
 * Get weekday of first day of month (0=Sun..6=Sat) in timezone
 */
export function getFirstDayOfMonthInTimezone(dateStr: string, timezone: string): number {
  const [year, month] = dateStr.split('-').map(Number);
  const d = parseDateInTimezone(`${year}-${String(month).padStart(2, '0')}-01`, timezone);
  return d.getDay();
}

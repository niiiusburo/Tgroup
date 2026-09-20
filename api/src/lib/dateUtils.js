/**
 * Backend date utilities for Vietnam timezone (Asia/Ho_Chi_Minh, UTC+7)
 * @crossref:used-in[appointments, partners, payments, employees, products, feedback, reports]
 */

const VIETNAM_TZ = 'Asia/Ho_Chi_Minh';

/**
 * Format a Date to Vietnam timezone ISO-like string (YYYY-MM-DDTHH:mm:ss)
 * This is NOT a true ISO string (which is always UTC) — it's Vietnam local time.
 */
function formatToVietnam(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: VIETNAM_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}

/**
 * Get current date-time string in Vietnam timezone
 * Returns: YYYY-MM-DDTHH:mm:ss
 */
function getVietnamNow() {
  return formatToVietnam(new Date());
}

/**
 * Get current date string in Vietnam timezone
 * Returns: YYYY-MM-DD
 */
function getVietnamToday() {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: VIETNAM_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Get current year in Vietnam timezone
 */
function getVietnamYear() {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: VIETNAM_TZ,
    year: 'numeric',
  });
  const parts = formatter.formatToParts(new Date());
  return parseInt(parts.find((p) => p.type === 'year')?.value ?? '0', 10);
}

/**
 * Get current timestamp as ISO string (UTC) — for true timestamps
 */
function getUtcISOString() {
  return new Date().toISOString();
}

/** Maximum past window for calendar views and reports. */
const LOOKBACK_MONTHS = 3;

function toDateOnly(value) {
  return String(value || '').slice(0, 10);
}

function addCalendarMonths(dateStr, months) {
  const [year, month, day] = toDateOnly(dateStr).split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCMonth(utc.getUTCMonth() + months);
  return utc.toISOString().slice(0, 10);
}

function getEarliestLookbackDate(today = getVietnamToday()) {
  return addCalendarMonths(today, -LOOKBACK_MONTHS);
}

function isBeforeLookback(dateStr, today = getVietnamToday()) {
  const dateOnly = toDateOnly(dateStr);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return false;
  return dateOnly < getEarliestLookbackDate(today);
}

function clampToLookback(dateStr, today = getVietnamToday()) {
  const dateOnly = toDateOnly(dateStr);
  const earliest = getEarliestLookbackDate(today);
  if (!dateOnly) return earliest;
  return dateOnly < earliest ? earliest : dateOnly;
}

module.exports = {
  VIETNAM_TZ,
  LOOKBACK_MONTHS,
  formatToVietnam,
  getVietnamNow,
  getVietnamToday,
  getVietnamYear,
  getUtcISOString,
  addCalendarMonths,
  getEarliestLookbackDate,
  isBeforeLookback,
  clampToLookback,
};

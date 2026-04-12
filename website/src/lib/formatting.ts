/**
 * Vietnamese Dong formatting utilities.
 * Convention: dot as thousand separator (1.000.000 ₫), no decimals.
 */

const CURRENCY_SUFFIX = ' \u20ab'; // " ₫"

function groupWithDots(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatVND(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return '0' + CURRENCY_SUFFIX;
  }
  const rounded = Math.trunc(amount);
  const negative = rounded < 0;
  const digits = Math.abs(rounded).toString();
  return (negative ? '-' : '') + groupWithDots(digits) + CURRENCY_SUFFIX;
}

export function formatVNDInput(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }
  const rounded = Math.trunc(value);
  const negative = rounded < 0;
  const digits = Math.abs(rounded).toString();
  return (negative ? '-' : '') + groupWithDots(digits);
}

export function parseVND(text: string | null | undefined): number | null {
  if (text === null || text === undefined) return null;
  let cleaned = String(text).trim();
  if (cleaned.length === 0) return null;

  cleaned = cleaned.replace(/\u20ab/g, '');
  cleaned = cleaned.replace(/[đĐ]/g, '');
  cleaned = cleaned.replace(/VND/gi, '');
  cleaned = cleaned.replace(/\s+/g, '');

  if (cleaned.length === 0) return null;
  if (cleaned.startsWith('-')) return null;

  const separators = cleaned.match(/[.,]/g) ?? [];
  if (separators.length === 0) {
    if (!/^\d+$/.test(cleaned)) return null;
    return Number(cleaned);
  }

  const segments = cleaned.split(/[.,]/);
  if (segments.some((seg) => !/^\d+$/.test(seg))) return null;

  const head = segments[0];
  const tail = segments.slice(1);
  if (head.length === 0 || head.length > 3) return null;
  if (tail.some((seg) => seg.length !== 3)) return null;

  return Number(segments.join(''));
}

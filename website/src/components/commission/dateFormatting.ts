const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00+07:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeLocale(locale?: string) {
  return locale?.startsWith('vi') ? 'vi-VN' : 'en-US';
}

export function formatCommissionDate(value?: string | Date | null, locale?: string): string {
  const date = toDate(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: VIETNAM_TIME_ZONE,
  }).format(date);
}

export function formatCommissionDateRange(
  from: string,
  to: string,
  options: {
    allLabel: string;
    fromPrefix: string;
    untilPrefix: string;
    locale?: string;
  }
) {
  const fromText = formatCommissionDate(from, options.locale);
  const toText = formatCommissionDate(to, options.locale);
  const hasFrom = Boolean(from);
  const hasTo = Boolean(to);

  if (hasFrom && hasTo && fromText === toText) return fromText;
  if (hasFrom && hasTo) return `${fromText} -> ${toText}`;
  if (hasFrom) return `${options.fromPrefix} ${fromText}`;
  if (hasTo) return `${options.untilPrefix} ${toText}`;
  return options.allLabel;
}

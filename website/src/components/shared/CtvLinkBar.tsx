import { useTranslation } from 'react-i18next';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toMs(d: string | Date | null | undefined): number | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Fraction of the window remaining, clamped to [0,1]. Falls back to a 6-month denominator. */
export function ctvLinkBarFraction(
  anchorAt: string | Date | null | undefined,
  expiresAt: string | Date | null | undefined,
  nowMs: number = Date.now(),
): number {
  const exp = toMs(expiresAt);
  if (exp == null) return 0;
  const anchor = toMs(anchorAt);
  const total = anchor != null && exp > anchor ? exp - anchor : 6 * 30 * MS_PER_DAY;
  const remaining = exp - nowMs;
  const f = remaining / total;
  return Math.max(0, Math.min(1, f));
}

interface CtvLinkBarProps {
  readonly ctvName?: string | null;
  readonly anchorAt?: string | Date | null;
  readonly expiresAt?: string | Date | null;
  readonly active: boolean;
  readonly eligible: boolean;
  readonly compact?: boolean;
}

export function CtvLinkBar({ ctvName, anchorAt, expiresAt, active, eligible, compact }: CtvLinkBarProps) {
  const { t } = useTranslation('ctv');
  // No CTV at all → render nothing (eligible-with-no-owner is shown by the portal banner instead).
  if (!ctvName && !expiresAt) return null;

  const expMs = toMs(expiresAt);
  const nowMs = Date.now();
  const remainingDays = expMs != null ? Math.max(0, Math.round((expMs - nowMs) / MS_PER_DAY)) : null;
  const fraction = ctvLinkBarFraction(anchorAt, expiresAt, nowMs);
  const isExpired = !active || eligible || (remainingDays != null && remainingDays <= 0);

  // Color band by remaining time (mirrors StatusBadge palette).
  let fill = 'bg-emerald-500';
  let track = 'bg-emerald-100';
  if (isExpired) { fill = 'bg-gray-300'; track = 'bg-gray-100'; }
  else if (remainingDays != null && remainingDays <= 7) { fill = 'bg-red-500'; track = 'bg-red-100'; }
  else if (remainingDays != null && remainingDays <= 42) { fill = 'bg-amber-500'; track = 'bg-amber-100'; }

  const label = (() => {
    if (isExpired) return t('link.expired', 'Đã hết hạn — khách có thể gắn CTV khác');
    if (remainingDays == null) return t('link.activeNoDate', 'Đang liên kết');
    if (remainingDays >= 60) return t('link.monthsLeft', { count: Math.round(remainingDays / 30), defaultValue: `≈${Math.round(remainingDays / 30)} tháng còn lại` });
    if (remainingDays >= 14) return t('link.weeksLeft', { count: Math.round(remainingDays / 7), defaultValue: `≈${Math.round(remainingDays / 7)} tuần còn lại` });
    return t('link.daysLeft', { count: remainingDays, defaultValue: `≈${remainingDays} ngày còn lại` });
  })();

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'} data-testid={isExpired ? 'ctv-link-bar-expired' : 'ctv-link-bar'}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-medium text-gray-700">
          {t('link.ctvLabel', 'CTV')}: <strong>{ctvName || '—'}</strong>
        </span>
        <span className={isExpired ? 'text-gray-500' : 'text-gray-600'}>{label}</span>
      </div>
      <div className={`h-1.5 w-full overflow-hidden rounded-full ${track}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}>
        <div className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${fill}`} style={{ width: `${Math.round(fraction * 100)}%` }} />
      </div>
    </div>
  );
}

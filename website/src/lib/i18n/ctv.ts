import { useTranslation } from 'react-i18next';
import { formatVND, formatVNDInput } from '@/lib/formatting';

type CtvLob = 'dental' | 'cosmetic';
type CtvStage = 'referred' | 'visited' | 'serviced' | 'paid';

function formatCompactVnd(amount: number | null | undefined) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '0K';
  const value = Math.trunc(amount);
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value);

  if (absolute >= 1_000_000) {
    const millions = absolute / 1_000_000;
    const label = Number.isInteger(millions)
      ? String(millions)
      : millions.toFixed(1).replace(/\.0$/, '');
    return `${sign}${label}M`;
  }

  if (absolute >= 1_000) {
    return `${sign}${formatVNDInput(Math.round(absolute / 1_000))}K`;
  }

  return formatVND(value);
}

export function useCtvLocale() {
  const { t, i18n } = useTranslation('ctv');
  const lang = i18n.language;
  const dateLocale = lang.startsWith('en') ? 'en-US' : 'vi-VN';

  function formatDate(value: string | null | undefined) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatJoinedDate(value: string | null | undefined) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  }

  return {
    lang,
    dateLocale,
    formatDate,
    formatShortDate: formatDate,
    formatJoinedDate,
    formatCurrency: (amount: number | null | undefined) => formatVND(amount),
    formatCompactCurrency: formatCompactVnd,
    getLobLabel: (lob: CtvLob | string) => t(`lobs.${lob}`, { defaultValue: lob }),
    getStageLabel: (stage: CtvStage) => t(`tracking.stage.${stage}`),
    getServiceStatusLabel: (status: string) => {
      if (status === 'paid') return t('serviceStatus.paid');
      if (status === 'reversed') return t('serviceStatus.reversed');
      return t('serviceStatus.pending');
    },
    unknownClient: () => t('unknownClient'),
    unknownService: () => t('unknownService'),
    unknownValue: () => t('unknownValue'),
  };
}

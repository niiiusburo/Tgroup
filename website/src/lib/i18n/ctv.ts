import { useTranslation } from 'react-i18next';
import { formatVND } from '@/lib/formatting';

export function useCtvLocale() {
  const { t, i18n } = useTranslation('ctv');
  const lang = i18n.language;
  const dateLocale = lang.startsWith('en') ? 'en-US' : 'vi-VN';

  return {
    lang,
    dateLocale,
    formatDate: (value: string | null | undefined) => {
      if (!value) return '-';
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '-';
      return d.toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' });
    },
    formatShortDate: (value: string | null | undefined) => {
      if (!value) return '-';
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '-';
      return d.toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' });
    },
    formatJoinedDate: (value: string | null | undefined) => {
      if (!value) return null;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      return new Intl.DateTimeFormat(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
    },
    formatCurrency: (amount: number | null | undefined) => formatVND(amount),
    getLobLabel: (lob: 'dental' | 'cosmetic') => t(`lobs.${lob}`, { defaultValue: lob }),
    getServiceStatusLabel: (status: string) => {
      if (status === 'paid') return t('serviceStatus.paid');
      if (status === 'reversed') return t('serviceStatus.reversed');
      return t('serviceStatus.pending');
    },
    getStepLabel: (step: 'referred' | 'visited' | 'serviced' | 'paid') => t(`steps.${step}`),
    unknownService: () => t('unknownService', { defaultValue: 'Service' }),
    unknownClient: () => t('unknownClient', { defaultValue: 'Client' }),
  };
}

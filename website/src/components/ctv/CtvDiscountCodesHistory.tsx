/**
 * @crossref:domain[ctv]
 * @crossref:used-in[NK3 CTV portal and referral surface: website/src/components/ctv/CtvDiscountCodesHistory]
 * @crossref:uses[product-map/domains/ctv.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Filter, RefreshCw, Search, UserCheck, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  fetchMyDiscountCodeStats,
  fetchMyDiscountCodes,
  type CtvDiscountCodeRow,
} from '@/lib/api/discountCodes';
import { cn } from '@/lib/utils';
import { useCtvLocale } from '@/lib/i18n/ctv';

const GLASS =
  'rounded-3xl border border-white/40 bg-white/70 p-4 shadow-[0_12px_32px_rgba(44,62,80,0.08)] backdrop-blur-[18px] backdrop-saturate-[180%] sm:p-5';

type StatusFilter = 'all' | 'claimed' | 'checked_in' | 'used' | 'expired';

function statusBadgeClass(status: string): string {
  if (status === 'used') return 'bg-green-100 text-green-800 ring-green-200';
  if (status === 'expired') return 'bg-gray-100 text-gray-600 ring-gray-200';
  if (status === 'checked_in') return 'bg-blue-100 text-blue-800 ring-blue-200';
  return 'bg-orange-100 text-orange-800 ring-orange-200';
}

export function CtvDiscountCodesHistory() {
  const { t } = useTranslation('ctv');
  const ctv = useCtvLocale();

  function formatDate(value: string | null | undefined): string {
    if (!value) return t('common.emDash');
    return new Intl.DateTimeFormat(ctv.dateLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }
  const [codes, setCodes] = useState<CtvDiscountCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [stats, setStats] = useState({ totalCodes: 0, usedCodes: 0, conversionRate: '0.0' });

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        fetchMyDiscountCodes({ status: status === 'all' ? undefined : status, limit: 50 }),
        fetchMyDiscountCodeStats(),
      ]);
      setCodes(listRes.codes || []);
      setStats(statsRes.stats);
    } catch {
      if (!opts?.silent) setCodes([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => void load({ silent: true }), 30_000);
    return () => clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return codes;
    const term = search.toLowerCase();
    return codes.filter(
      (row) =>
        row.code.toLowerCase().includes(term) ||
        row.visitorName?.toLowerCase().includes(term) ||
        row.visitorPhone?.includes(term)
    );
  }, [codes, search]);

  return (
    <section className={cn(GLASS, 'mt-5')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{t('codeHistory.title')}</h3>
          <p className="mt-1 text-xs text-gray-500">{t('codeHistory.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          {t('codeHistory.refresh')}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-orange-50 px-2 py-3">
          <p className="text-lg font-bold text-orange-700">{stats.totalCodes}</p>
          <p className="text-[10px] font-semibold uppercase text-orange-600">{t('codeHistory.total')}</p>
        </div>
        <div className="rounded-2xl bg-green-50 px-2 py-3">
          <p className="text-lg font-bold text-green-700">{stats.usedCodes}</p>
          <p className="text-[10px] font-semibold uppercase text-green-600">{t('codeHistory.used')}</p>
        </div>
        <div className="rounded-2xl bg-gray-50 px-2 py-3">
          <p className="text-lg font-bold text-gray-800">{stats.conversionRate}%</p>
          <p className="text-[10px] font-semibold uppercase text-gray-600">{t('codeHistory.conversion')}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('codeHistory.searchPlaceholder')}
            className="h-10 w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-orange-300"
          />
        </div>
        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="h-10 w-full appearance-none rounded-2xl border border-gray-200 bg-white pl-9 pr-8 text-sm outline-none focus:border-orange-300 sm:min-w-[140px]"
          >
            <option value="all">{t('codeHistory.filterAll')}</option>
            <option value="claimed">{t('codeHistory.filterClaimed')}</option>
            <option value="checked_in">{t('codeHistory.filterCheckedIn')}</option>
            <option value="used">{t('codeHistory.filterUsed')}</option>
            <option value="expired">{t('codeHistory.filterExpired')}</option>
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="py-8 text-center text-sm text-gray-500">{t('codeHistory.loading')}</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">{t('codeHistory.empty')}</p>
        ) : (
          filtered.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white/90 px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-bold tracking-wide text-gray-900">{row.code}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {row.visitorName || t('codeHistory.anonymous')}
                  {row.visitorPhone ? ` · ${row.visitorPhone}` : ''}
                </p>
                <p className="mt-1 text-[11px] text-gray-400">
                  <Clock className="mr-1 inline h-3 w-3" />
                  {formatDate(row.generatedAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-red-600">{row.discountLabel}</p>
                <span
                  className={cn(
                    'mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1',
                    statusBadgeClass(row.status)
                  )}
                >
                  {row.status === 'used' ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : row.status === 'checked_in' ? (
                    <UserCheck className="h-3 w-3" />
                  ) : row.status === 'expired' ? (
                    <XCircle className="h-3 w-3" />
                  ) : null}
                  {t(`codeHistory.status.${row.status}`, { defaultValue: t('codeHistory.status.unknown') })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
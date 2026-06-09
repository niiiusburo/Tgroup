/**
 * @crossref:domain[earnings-commissions]
 * @crossref:used-in[NK3 commission and CTV admin surface: website/src/components/commission/DiscountCodesAdminTab]
 * @crossref:uses[product-map/domains/earnings-commissions.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Filter, RefreshCw, Search, Tag, UserCheck, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { fetchAdminDiscountCodes, type CtvDiscountCodeRow } from '@/lib/api/discountCodes';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'claimed' | 'checked_in' | 'used' | 'expired';

function statusBadgeClass(status: string): string {
  if (status === 'used') return 'bg-green-100 text-green-800 ring-green-200';
  if (status === 'expired') return 'bg-gray-100 text-gray-600 ring-gray-200';
  if (status === 'checked_in') return 'bg-blue-100 text-blue-800 ring-blue-200';
  return 'bg-orange-100 text-orange-800 ring-orange-200';
}

export function DiscountCodesAdminTab() {
  const { t } = useTranslation('commission');
  const [codes, setCodes] = useState<CtvDiscountCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async (opts?: { silent?: boolean; nextPage?: number }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetchAdminDiscountCodes({
        status: status === 'all' ? undefined : status,
        search: search.trim() || undefined,
        page: opts?.nextPage ?? page,
        limit: 20,
      });
      setCodes(res.codes || []);
      setTotalPages(res.pagination?.totalPages ?? 1);
    } catch {
      setCodes([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    setPage(1);
    void load({ nextPage: 1 });
  }, [status, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => codes, [codes]);

  function formatDate(value: string | null | undefined): string {
    if (!value) return t('common.emDash');
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-bold text-gray-900">{t('discountCodes.title')}</h3>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          {t('discountCodes.refresh')}
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('discountCodes.searchPlaceholder')}
            className="h-10 w-full rounded-2xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-violet-300"
          />
        </div>
        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="h-10 w-full appearance-none rounded-2xl border border-gray-200 bg-white pl-9 pr-8 text-sm outline-none focus:border-violet-300 sm:min-w-[140px]"
          >
            <option value="all">{t('discountCodes.filterAll')}</option>
            <option value="claimed">{t('discountCodes.filterClaimed')}</option>
            <option value="checked_in">{t('discountCodes.filterCheckedIn')}</option>
            <option value="used">{t('discountCodes.filterUsed')}</option>
            <option value="expired">{t('discountCodes.filterExpired')}</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">{t('discountCodes.colCode')}</th>
              <th className="px-4 py-3">{t('discountCodes.colCtv')}</th>
              <th className="px-4 py-3">{t('discountCodes.colDiscount')}</th>
              <th className="px-4 py-3">{t('discountCodes.colStatus')}</th>
              <th className="px-4 py-3">{t('discountCodes.colCustomer')}</th>
              <th className="px-4 py-3">{t('discountCodes.colDate')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  {t('discountCodes.loading')}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  {t('discountCodes.empty')}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-bold text-gray-900">{row.code}</td>
                  <td className="px-4 py-3 text-gray-600">{row.ctvName || '—'}</td>
                  <td className="px-4 py-3 font-bold text-red-600">{row.discountLabel}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1',
                        statusBadgeClass(row.status)
                      )}
                    >
                      {row.status === 'used' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : row.status === 'checked_in' ? (
                        <UserCheck className="h-3 w-3" />
                      ) : row.status === 'expired' ? (
                        <XCircle className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      {t(`discountCodes.status.${row.status}`, { defaultValue: row.status })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.visitorName || row.visitorPhone || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(row.generatedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => {
              const p = Math.max(1, page - 1);
              setPage(p);
              void load({ nextPage: p });
            }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            {t('discountCodes.prev')}
          </button>
          <span className="text-sm text-gray-600">
            {t('discountCodes.page', { page, total: totalPages })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => {
              const p = Math.min(totalPages, page + 1);
              setPage(p);
              void load({ nextPage: p });
            }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            {t('discountCodes.next')}
          </button>
        </div>
      )}
    </section>
  );
}

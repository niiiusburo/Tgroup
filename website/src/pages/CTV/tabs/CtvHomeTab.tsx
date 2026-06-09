/**
 * @crossref:domain[ctv]
 * @crossref:used-in[NK3 SPA page route: website/src/pages/CTV/tabs/CtvHomeTab]
 * @crossref:uses[product-map/domains/ctv.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
import { Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { formatVND } from '@/lib/formatting';
import type { CtvCommissionSummary, CtvReferral } from '@/lib/api/ctv';
import { useCtvLocale } from '@/lib/i18n/ctv';

interface CtvHomeTabProps {
  readonly summary: CtvCommissionSummary | null;
  readonly referrals: CtvReferral[];
  readonly profileName: string;
  readonly isLoading: boolean;
}

export function CtvHomeTab({ summary, referrals, profileName, isLoading }: CtvHomeTabProps) {
  const { t } = useTranslation('ctv');
  const ctv = useCtvLocale();
  const pending = summary?.totals.pending ?? 0;
  const paid = summary?.totals.paid ?? 0;
  const dentalPending = summary?.totals.dentalPending ?? 0;
  const cosmeticPending = summary?.totals.cosmeticPending ?? 0;
  const splitTotal = dentalPending + cosmeticPending || pending;
  const dentalPercent = splitTotal > 0 ? Math.round((dentalPending / splitTotal) * 100) : 0;
  const cosmeticPercent = splitTotal > 0 ? 100 - dentalPercent : 0;

  if (isLoading) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <div className="h-8 w-52 animate-pulse rounded bg-gray-100" />
        <div className="h-40 animate-pulse rounded-3xl bg-white ring-1 ring-gray-100" />
        <div className="h-28 animate-pulse rounded-3xl bg-white ring-1 ring-gray-100" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">{t('home.greeting', { name: profileName })}</h2>
      <p className="mt-1 text-sm text-gray-600">{t('home.subtitle')}</p>

      <a
        href="/bang-gia"
        className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-4 text-base font-bold text-white shadow-[0_12px_28px_rgba(194,65,12,0.28)] ring-1 ring-orange-400/40 transition-transform active:scale-[0.98]"
      >
        <Tag className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>{t('home.pricingCta')}</span>
      </a>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm shadow-orange-500/5 ring-1 ring-gray-100">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-orange-600">{t('home.pendingCommission')}</p>
        <p className="mt-1 text-[2.5rem] font-bold leading-none tracking-tight text-gray-900">{formatVND(pending)}</p>
        <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-gray-100">
          <span className="h-full bg-orange-500" style={{ width: `${dentalPercent}%` }} />
          <span className="h-full bg-rose-400" style={{ width: `${cosmeticPercent}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <span className="flex items-center gap-2 text-gray-600">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            {ctv.getLobLabel('dental')} <strong className="text-gray-900">{formatVND(dentalPending)}</strong>
          </span>
          <span className="flex items-center gap-2 text-gray-600">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            {ctv.getLobLabel('cosmetic')} <strong className="text-gray-900">{formatVND(cosmeticPending)}</strong>
          </span>
        </div>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">{t('home.thisMonth')}</p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{referrals.length}</p>
            <p className="mt-1 text-xs text-gray-500">{t('summary.referredClients')}</p>
          </div>
          <div className="border-x border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{summary?.counts.pending ?? 0}</p>
            <p className="mt-1 text-xs text-gray-500">{t('home.services')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">{formatVND(paid).replace(/\s+đ$/, '')}</p>
            <p className="mt-1 text-xs text-gray-500">{t('home.paidOut')}</p>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">{t('home.recentActivity')}</p>
        <div className="mt-3 space-y-2 text-sm">
          {(summary?.recent ?? []).slice(0, 5).map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 border-b border-gray-50 py-2 last:border-0">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{row.client_name || ctv.unknownClient()}</p>
                <p className="text-xs text-gray-500">{ctv.getLobLabel(row.lob)}</p>
              </div>
              <p className="shrink-0 font-bold text-emerald-600">+{formatVND(Math.abs(row.amount))}</p>
            </div>
          ))}
          {summary?.recent?.length ? null : (
            <p className="py-4 text-center text-sm text-gray-400">{t('home.noActivityPlain')}</p>
          )}
        </div>
      </section>
    </div>
  );
}
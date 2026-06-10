/**
 * @crossref:domain[ctv]
 * @crossref:used-in[NK3 SPA page route: website/src/pages/CTV/tabs/CtvCommissionTab]
 * @crossref:uses[product-map/domains/ctv.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatVND } from '@/lib/formatting';
import type { CtvCommissionRow, CtvCommissionSummary } from '@/lib/api/ctv';
import { cn } from '@/lib/utils';
import { useCtvLocale } from '@/lib/i18n/ctv';

type CommissionMode = 'pending' | 'paid';

interface CtvCommissionTabProps {
  readonly summary: CtvCommissionSummary | null;
  readonly isLoading: boolean;
  readonly onRowClick?: (row: CtvCommissionRow) => void;
}

function CommissionRow({
  row,
  onRowClick,
}: {
  readonly row: CtvCommissionRow;
  readonly onRowClick?: (row: CtvCommissionRow) => void;
}) {
  const { t } = useTranslation('ctv');
  const ctv = useCtvLocale();
  const clientLabel = row.client_name || ctv.unknownClient();
  const serviceLabel = row.service_name || ctv.unknownService();
  const clickable = !!onRowClick && !!row.client_id;

  const content = (
    <>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900">{clientLabel}</p>
        <p className="mt-1 text-xs text-gray-500">
          {serviceLabel} · {ctv.getLobLabel(row.lob)} · {ctv.getServiceStatusLabel(row.status)}
        </p>
      </div>
      <p className="shrink-0 text-sm font-bold text-orange-600">{formatVND(Math.abs(row.amount))}</p>
    </>
  );

  if (!clickable) {
    return (
      <article className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        {content}
      </article>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onRowClick(row)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-gray-100 transition-colors hover:ring-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-300/60"
      aria-label={t('home.viewActivityFor', { client: clientLabel, service: serviceLabel })}
    >
      {content}
    </button>
  );
}

export function CtvCommissionTab({ summary, isLoading, onRowClick }: CtvCommissionTabProps) {
  const { t } = useTranslation('ctv');
  const [mode, setMode] = useState<CommissionMode>('pending');

  const rows = useMemo(() => {
    if (!summary) return [];
    if (mode === 'pending') return summary.pendingList?.length ? summary.pendingList : summary.recent.filter((row) => row.status === 'pending');
    return summary.paidList?.length ? summary.paidList : summary.recent.filter((row) => row.status !== 'pending');
  }, [mode, summary]);

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-3xl bg-white ring-1 ring-gray-100" aria-hidden="true" />;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{t('commission.myCommission')}</h2>

      <div className="mt-4 inline-flex rounded-full bg-orange-50 p-1 ring-1 ring-orange-100">
        {(['pending', 'paid'] as CommissionMode[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMode(item)}
            className={cn(
              'rounded-full px-5 py-1.5 text-sm font-semibold transition-all',
              mode === item ? 'bg-white text-orange-700 shadow-sm shadow-orange-500/20' : 'text-orange-600/70'
            )}
          >
            {t(`commission.${item}`)}
          </button>
        ))}
      </div>

      <section className="mt-5 rounded-3xl bg-orange-500 p-5 text-white shadow-lg shadow-orange-500/20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-orange-100">
          {mode === 'pending' ? t('commission.totalPending') : t('commission.totalPaid')}
        </p>
        <p className="mt-1 text-3xl font-bold">
          {formatVND(mode === 'pending' ? summary?.totals.pending ?? 0 : summary?.totals.paid ?? 0)}
        </p>
      </section>

      <div className="mt-4 space-y-2">
        {rows.map((row) => (
          <CommissionRow key={row.id} row={row} onRowClick={onRowClick} />
        ))}
        {rows.length === 0 ? (
          <p className="rounded-2xl bg-white p-5 text-center text-sm text-gray-500 ring-1 ring-gray-100">
            {mode === 'pending' ? t('commission.noPending') : t('commission.noPayouts')}
          </p>
        ) : null}
      </div>
    </div>
  );
}

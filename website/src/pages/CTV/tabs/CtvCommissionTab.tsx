import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pill } from '@/components/ctv/Pill';
import type { CtvCommissionSummary } from '@/lib/api/ctv';
import { useCtvLocale } from '@/lib/i18n/ctv';

type CommissionSub = 'pending' | 'paid';

interface Props {
  summary: CtvCommissionSummary | null;
}

export function CtvCommissionTab({ summary }: Props) {
  const { t } = useTranslation('ctv');
  const ctv = useCtvLocale();
  const [commissionSub, setCommissionSub] = useState<CommissionSub>('pending');

  const pending = summary?.totals?.pending || 0;
  const paid = summary?.totals?.paid || 0;

  return (
    <>
      <div className="text-xl font-semibold tracking-tight mb-4">{t('commission.myCommission')}</div>

      {/* Segmented control */}
      <div className="inline-flex bg-orange-50 ring-1 ring-orange-100 rounded-full p-1 mb-5">
        <button
          onClick={() => setCommissionSub('pending')}
          className={`px-6 py-1.5 rounded-full text-sm font-semibold transition-all ${
            commissionSub === 'pending'
              ? 'bg-white text-orange-700 shadow-sm shadow-orange-500/20'
              : 'text-orange-600/70 hover:text-orange-700'
          }`}
        >
          {t('commission.pending')}
        </button>
        <button
          onClick={() => setCommissionSub('paid')}
          className={`px-6 py-1.5 rounded-full text-sm font-semibold transition-all ${
            commissionSub === 'paid'
              ? 'bg-white text-orange-700 shadow-sm shadow-orange-500/20'
              : 'text-orange-600/70 hover:text-orange-700'
          }`}
        >
          {t('commission.paid')}
        </button>
      </div>

      {commissionSub === 'pending' ? (
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-3xl p-5 shadow-lg shadow-orange-500/25">
            <div className="text-[11px] uppercase tracking-[0.15em] font-semibold text-orange-100/90">{t('commission.totalPending')}</div>
            <div className="text-3xl font-bold tabular-nums mt-1">{ctv.formatCurrency(pending)}</div>
            <div className="text-sm text-orange-100/90 mt-1">
              {t('commission.servicesAcrossClients', { count: summary?.counts?.pending || 0, clients: summary?.pendingList?.length || 0 })}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.15em] font-semibold text-gray-500 mb-2 px-1">{t('commission.byService')}</div>
            {(summary?.pendingList || summary?.recent || []).filter((r: any) => r.status === 'pending').map((row: any, idx: number) => (
              <div key={idx} className="bg-white rounded-2xl p-4 mb-2 ring-1 ring-gray-100 flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Pill lob={row.lob} />
                  <span className="font-medium truncate">{row.client_name || ctv.unknownClient()}</span>
                </div>
                <div className="font-semibold tabular-nums shrink-0">{ctv.formatCurrency(row.amount)}</div>
              </div>
            ))}
            {(!summary?.pendingList || summary.pendingList.length === 0) && (
              <div className="text-gray-400 px-2 py-2 text-sm">{t('commission.noPending')}</div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-white rounded-3xl p-5 ring-1 ring-gray-100 shadow-sm">
            <div className="text-[11px] uppercase tracking-[0.15em] font-semibold text-gray-500">{t('commission.totalPaid')}</div>
            <div className="text-3xl font-bold tabular-nums text-gray-900 mt-1">{ctv.formatCurrency(paid)}</div>
            <div className="text-sm text-gray-500 mt-1">{summary?.payouts?.length || 0} {t('commission.payoutCycles')}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.15em] font-semibold text-gray-500 mb-2 px-1">{t('commission.payoutCycles')}</div>
            {(summary?.payouts || []).map((p) => (
              <div key={p.id} className="bg-white p-4 rounded-2xl ring-1 ring-gray-100 mb-2 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-sm font-medium">{p.cycle_label}</div>
                    <div className="text-xs text-gray-500">{ctv.getLobLabel(p.lob)} · {ctv.formatShortDate(p.paid_at)}</div>
                  </div>
                  {p.receipt_url && (
                    <a href={p.receipt_url} target="_blank" rel="noreferrer">
                      <img src={p.receipt_url} alt="Receipt" className="h-8 w-8 rounded border border-gray-200 object-cover" />
                    </a>
                  )}
                </div>
                <div className="font-semibold tabular-nums">{ctv.formatCurrency(p.total_amount)}</div>
              </div>
            ))}
            {(!summary?.payouts || summary.payouts.length === 0) && (
              <div className="bg-white rounded-2xl p-4 ring-1 ring-gray-100 text-sm text-gray-500">{t('commission.noPayouts')}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

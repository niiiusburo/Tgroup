import { useTranslation } from 'react-i18next';

import { Pill } from '@/components/ctv/Pill';
import type { CtvCommissionSummary } from '@/lib/api/ctv';
import { useCtvLocale } from '@/lib/i18n/ctv';

interface Props {
  summary: CtvCommissionSummary | null;
  displayName: string;
}

export function CtvHomeTab({ summary, displayName }: Props) {
  const { t } = useTranslation('ctv');
  const ctv = useCtvLocale();

  const pending = summary?.totals?.pending || 0;
  const paid = summary?.totals?.paid || 0;
  const dentalP = summary?.totals?.dentalPending || 0;
  const cosP = summary?.totals?.cosmeticPending || 0;
  const totalP = dentalP + cosP || pending;
  const dentalPct = totalP > 0 ? Math.round((dentalP / totalP) * 100) : 62;
  const cosPct = 100 - dentalPct;

  return (
    <>
      <div className="text-2xl font-semibold tracking-tight mb-1">
        {t('home.greeting', { name: displayName })} <span className="inline-block">👋</span>
      </div>
      <div className="text-sm text-gray-600 mb-5">{t('home.subtitle')}</div>

      {/* Pending Commission Tile */}
      <div className="bg-white rounded-3xl shadow-sm shadow-orange-500/5 ring-1 ring-gray-100 p-5 mb-4">
        <div className="uppercase tracking-[0.15em] text-[11px] font-semibold text-orange-600 mb-1">
          {t('home.pendingCommission')}
        </div>
        <div className="text-[2.5rem] leading-none font-bold tabular-nums tracking-tight text-gray-900 mb-4">
          {ctv.formatCurrency(pending)}
        </div>

        {/* Split bar */}
        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden flex mb-3">
          <div style={{ width: `${dentalPct}%`, background: '#F97316' }} className="h-full transition-all duration-500" />
          <div style={{ width: `${cosPct}%`, background: '#FB7185' }} className="h-full transition-all duration-500" />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#F97316' }} />
            <span className="text-gray-600">{t('home.dental')}</span>
            <span className="font-semibold tabular-nums">{ctv.formatCurrency(dentalP)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#FB7185' }} />
            <span className="text-gray-600">{t('home.cosmetic')}</span>
            <span className="font-semibold tabular-nums">{ctv.formatCurrency(cosP)}</span>
          </div>
        </div>
      </div>

      {/* This Month */}
      <div className="bg-white rounded-3xl shadow-sm ring-1 ring-gray-100 p-5 mb-4">
        <div className="uppercase tracking-[0.15em] text-[11px] font-semibold text-gray-500 mb-3">{t('home.thisMonth')}</div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{summary?.counts?.pending || 0}</div>
            <div className="text-xs text-gray-500 mt-1">{t('home.referrals')}</div>
          </div>
          <div className="border-x border-gray-100">
            <div className="text-2xl font-bold text-gray-900">{summary?.counts?.paid || 0}</div>
            <div className="text-xs text-gray-500 mt-1">{t('home.services')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600 tabular-nums">{ctv.formatCurrency(paid).replace(/\s+₫$/, '')}</div>
            <div className="text-xs text-gray-500 mt-1">{t('home.paidOut')} ({t('currency')})</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-3xl shadow-sm ring-1 ring-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="uppercase tracking-[0.15em] text-[11px] font-semibold text-gray-500">{t('home.recentActivity')}</div>
        </div>
        <div className="space-y-2 text-sm">
          {(summary?.recent || []).slice(0, 5).map((act, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b last:border-0 border-gray-50">
              <div className="flex items-center gap-2 min-w-0">
                <Pill lob={act.lob} />
                <span className="font-medium truncate">{act.client_name || ctv.unknownClient()}</span>
              </div>
              <div className={`font-semibold tabular-nums shrink-0 ${parseFloat(String(act.amount)) < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                {parseFloat(String(act.amount)) < 0 ? '' : '+'}{ctv.formatCurrency(Math.abs(act.amount))}
              </div>
            </div>
          ))}
          {(!summary?.recent || summary.recent.length === 0) && (
            <div className="text-gray-400 text-sm py-4 text-center" dangerouslySetInnerHTML={{ __html: t('home.noActivity') }} />
          )}
        </div>
      </div>
    </>
  );
}

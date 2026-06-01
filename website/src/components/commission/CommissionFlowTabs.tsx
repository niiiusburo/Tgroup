import { BadgeDollarSign, CalendarDays, CheckCircle2, ChevronRight, ReceiptText, Settings2, UserPlus, Users } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { formatCommissionDate } from './dateFormatting';

export type CommissionTabType = 'config' | 'ctvs' | 'newClients' | 'earnings' | 'payouts';

const tabs = [
  { key: 'config', icon: Settings2, color: 'text-slate-700', active: 'border-slate-300 bg-slate-50 text-slate-900' },
  { key: 'ctvs', icon: Users, color: 'text-sky-700', active: 'border-sky-300 bg-sky-50 text-sky-900' },
  { key: 'newClients', icon: UserPlus, color: 'text-orange-700', active: 'border-orange-300 bg-orange-50 text-orange-900' },
  { key: 'earnings', icon: BadgeDollarSign, color: 'text-emerald-700', active: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
  { key: 'payouts', icon: ReceiptText, color: 'text-rose-700', active: 'border-rose-300 bg-rose-50 text-rose-900' },
] as const;

interface CommissionFlowTabsProps {
  readonly activeTab: CommissionTabType;
  readonly onChange: (tab: CommissionTabType) => void;
}

export function CommissionFlowTabs({ activeTab, onChange }: CommissionFlowTabsProps) {
  const { t, i18n } = useTranslation('commission');
  const today = useMemo(() => formatCommissionDate(new Date(), i18n.language), [i18n.language]);
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.key === activeTab));

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {tabs.map((tab, index) => {
            const isCurrent = tab.key === activeTab;
            const isDone = index < activeIndex;
            const Icon = tab.icon;
            return (
              <div key={tab.key} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onChange(tab.key)}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'inline-flex h-9 items-center gap-2 rounded-lg border px-2.5 text-sm font-semibold transition-colors',
                    isCurrent ? tab.active : 'border-transparent text-gray-500 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <span
                    className={cn(
                      'grid h-5 w-5 shrink-0 place-items-center rounded-full',
                      isCurrent ? 'bg-white' : isDone ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'
                    )}
                  >
                    {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className={cn('h-3.5 w-3.5', isCurrent ? tab.color : '')} />}
                  </span>
                  <span className="truncate">{t(`tabs.${tab.key}`)}</span>
                </button>
                {index < tabs.length - 1 ? <ChevronRight className="h-4 w-4 text-gray-300" /> : null}
              </div>
            );
          })}
        </div>
        <div className="inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span>{t('flow.today')}</span>
          <span className="font-semibold text-gray-900">{today}</span>
        </div>
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-5">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isCurrent = tab.key === activeTab;
          const isDone = index < activeIndex;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cn(
                'min-h-[76px] rounded-lg border p-3 text-left transition-colors',
                isCurrent ? tab.active : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <Icon className={cn('h-4 w-4', isCurrent ? tab.color : 'text-gray-400')} />
                <span className={cn('text-xs font-semibold', isDone ? 'text-emerald-700' : isCurrent ? tab.color : 'text-gray-400')}>
                  {isCurrent ? t('flow.current') : isDone ? t('flow.complete') : t('flow.next')}
                </span>
              </div>
              <div className="mt-2 text-sm font-bold text-gray-900">{t(`tabs.${tab.key}`)}</div>
              <div className="mt-0.5 text-xs font-medium text-gray-500">{t(`flow.${tab.key}`)}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

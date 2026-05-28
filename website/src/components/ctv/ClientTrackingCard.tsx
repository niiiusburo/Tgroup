import { useTranslation } from 'react-i18next';
import { Pill } from './Pill';
import { StageBadge } from './StageBadge';
import { ProgressRing } from './ProgressRing';
import { MiniTimeline } from './MiniTimeline';
import { useCtvLocale } from '@/lib/i18n/ctv';

import type { CtvClientJourney } from '@/lib/api/ctv';

interface ClientTrackingCardProps {
  client: CtvClientJourney;
}

export function ClientTrackingCard({ client }: ClientTrackingCardProps) {
  const { t } = useTranslation('ctv');
  const ctv = useCtvLocale();
  const clientName = client.name || ctv.unknownClient();

  return (
    <div className="bg-white rounded-3xl shadow-sm ring-1 ring-gray-100 p-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <ProgressRing value={client.stage_progress as 0 | 1 | 2 | 3 | 4} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{clientName}</span>
            <StageBadge stage={client.stage} />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            {client.lobs.map((lob, i) => (
              <Pill key={i} lob={lob} />
            ))}
            <span>·</span>
            <span>{ctv.formatShortDate(client.referred_at)}</span>
          </div>
        </div>

        <div className="text-right">
          {client.payment ? (
            <div className="text-base font-bold text-emerald-600">+{ctv.formatCompactCurrency(client.payment.commission_earned)}</div>
          ) : client.estimated_commission ? (
            <div className="text-base font-bold text-orange-600">~{ctv.formatCompactCurrency(client.estimated_commission)}</div>
          ) : (
            <div className="text-base font-bold text-gray-400">—</div>
          )}
          <div className="text-[10px] text-gray-400">
            {client.payment ? t('tracking.received') : client.estimated_commission ? t('tracking.estimated') : t('tracking.received')}
          </div>
        </div>
      </div>

      {/* Mini Timeline */}
      <div className="mt-3 pt-3 border-t border-gray-50">
        <MiniTimeline stage={client.stage} />
        {/* Detail line */}
        <div className="mt-2 text-[11px] text-gray-500 text-center">
          {client.payment ? (
            <span>{client.service?.name || ctv.unknownService()} · {ctv.formatCurrency(client.service?.amount || 0)} · {t('tracking.commissionEarned')} {client.payment.commission_rate}</span>
          ) : client.service ? (
            <span>{client.service.name || ctv.unknownService()} · {ctv.formatCurrency(client.service.amount)} · {client.service.next_appointment ? `${t('tracking.nextVisit')}: ${ctv.formatShortDate(client.service.next_appointment)}` : ''}</span>
          ) : client.visit ? (
            <span>{client.visit.doctor || ctv.unknownValue()} · {ctv.formatShortDate(client.visit.date)} {client.visit.time || ''}</span>
          ) : (
            <span className="text-amber-600 font-medium">{t('tracking.noAppointment')}</span>
          )}
        </div>
      </div>
    </div>
  );
}

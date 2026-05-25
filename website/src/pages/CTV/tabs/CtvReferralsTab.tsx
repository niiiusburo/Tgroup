import { useTranslation } from 'react-i18next';
import { Pill } from '@/components/ctv/Pill';
import type { CtvReferral } from '@/lib/api/ctv';

interface Props {
  referrals: CtvReferral[];
}

function formatVnd(n: number) {
  return (n || 0).toLocaleString('vi-VN') + ' ₫';
}

export function CtvReferralsTab({ referrals }: Props) {
  const { t } = useTranslation('ctv');

  return (
    <>
      <div className="text-xl font-semibold tracking-tight mb-4">{t('referrals.myReferrals')}</div>
      <div className="space-y-2">
        {referrals.length === 0 && (
          <div className="bg-white rounded-3xl p-6 ring-1 ring-gray-100 text-center">
            <div className="text-gray-400 text-sm">{t('referrals.noReferrals')}</div>
          </div>
        )}
        {referrals.map((ref, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 ring-1 ring-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {ref.lobs.map((l, li) => (
                <Pill key={li} lob={l} />
              ))}
              <span className="font-semibold ml-auto sm:ml-0">{ref.name}</span>
            </div>
            {ref.phone && <div className="text-sm text-gray-500">{ref.phone}</div>}
            <div className="mt-2 flex justify-between items-center text-sm">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  ref.status === 'earning'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                }`}
              >
                {ref.status === 'earning' ? t('referrals.status.earning') : t('referrals.status.noVisitYet')}
              </span>
              <span className="text-gray-600">
                {ref.earned_count} {t('referrals.svc')} · <span className="font-semibold text-gray-900 tabular-nums">{formatVnd(ref.total_earned)}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

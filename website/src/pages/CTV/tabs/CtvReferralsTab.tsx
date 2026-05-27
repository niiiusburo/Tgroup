import { useTranslation } from 'react-i18next';
import { ReferralFlipCard } from '@/components/ctv/ReferralFlipCard';
import type { CtvReferral } from '@/lib/api/ctv';

interface Props {
  referrals: CtvReferral[];
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
          <ReferralFlipCard key={ref.id || i} referral={ref} />
        ))}
      </div>
    </>
  );
}

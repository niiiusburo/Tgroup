import { useTranslation } from 'react-i18next';

export type StageType = 'referred' | 'visited' | 'serviced' | 'paid';

interface StageBadgeProps {
  stage: StageType;
}

const STAGE_STYLES: Record<StageType, string> = {
  referred: 'bg-indigo-50 text-indigo-600',
  visited: 'bg-violet-50 text-violet-600',
  serviced: 'bg-orange-50 text-orange-600',
  paid: 'bg-emerald-50 text-emerald-600',
};

export function StageBadge({ stage }: StageBadgeProps) {
  const { t } = useTranslation('ctv');
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${STAGE_STYLES[stage]}`}>
      {t(`tracking.stageBadge.${stage}`)}
    </span>
  );
}

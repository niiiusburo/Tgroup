import { useTranslation } from 'react-i18next';
import type { StageType } from './StageBadge';

interface MiniTimelineProps {
  stage: StageType;
}

const STAGES: StageType[] = ['referred', 'visited', 'serviced', 'paid'];

export function MiniTimeline({ stage }: MiniTimelineProps) {
  const { t } = useTranslation('ctv');
  const currentIndex = STAGES.indexOf(stage);

  return (
    <div className="flex items-center justify-between">
      {STAGES.map((s, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold ${
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : isActive
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                }`}
              >
                {isDone ? '✓' : isActive ? '●' : String(i + 1)}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  isDone ? 'text-emerald-600' : isActive ? 'text-orange-600' : 'text-gray-400'
                }`}
              >
                {t(`tracking.stage.${s}`)}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 ${
                  isDone ? 'bg-emerald-200' : isActive ? 'bg-orange-200' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

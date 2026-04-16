import { cn } from '@/lib/utils';
import type { AppointmentStatus } from '@/types/appointment';
import { APPOINTMENT_STATUS_I18N_KEYS } from '@/constants';
import { useTranslation } from 'react-i18next';

interface StatusFilterChipsProps {
  statuses: { value: AppointmentStatus; count: number }[];
  selected: AppointmentStatus[];
  onToggle: (value: AppointmentStatus) => void;
}

export function StatusFilterChips({ statuses, selected, onToggle }: StatusFilterChipsProps) {
  const { t } = useTranslation('calendar');
  const isAll = selected.length === 0;

  const totalCount = statuses.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        data-testid="filter-status-all"
        onClick={() => isAll || onToggle('__ALL__' as AppointmentStatus)}
        className={cn(
          'px-3 py-1.5 text-sm font-medium rounded-full border transition-colors',
          isAll
            ? 'bg-primary text-white border-primary'
            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
        )}
      >
        Tất cả {totalCount}
      </button>
      {statuses.map((s) => {
        const isSelected = selected.includes(s.value);
        const label = t(APPOINTMENT_STATUS_I18N_KEYS[s.value] ?? s.value, { ns: 'common' });
        return (
          <button
            key={s.value}
            type="button"
            data-testid={`filter-status-${s.value}`}
            onClick={() => onToggle(s.value)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-full border transition-colors',
              isSelected
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            )}
          >
            {label} {s.count}
          </button>
        );
      })}
    </div>
  );
}

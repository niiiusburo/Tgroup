import { cn } from '@/lib/utils';

interface DoctorFilterChipsProps {
  doctors: { name: string; count: number }[];
  selected: string[];
  onToggle: (name: string) => void;
}

export function DoctorFilterChips({ doctors, selected, onToggle }: DoctorFilterChipsProps) {
  const isAll = selected.length === 0;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => isAll || onToggle('__ALL__')}
        className={cn(
          'px-3 py-1.5 text-sm font-medium rounded-full border transition-colors',
          isAll
            ? 'bg-primary text-white border-primary'
            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
        )}
      >
        Tất cả
      </button>
      {doctors.map((doc) => {
        const isSelected = selected.includes(doc.name);
        return (
          <button
            key={doc.name}
            type="button"
            data-testid="filter-doctor-chip"
            onClick={() => onToggle(doc.name)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-full border transition-colors',
              isSelected
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            )}
          >
            {doc.name}
          </button>
        );
      })}
    </div>
  );
}

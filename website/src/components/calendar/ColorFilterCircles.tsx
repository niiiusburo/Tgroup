import { cn } from '@/lib/utils';
import { APPOINTMENT_CARD_COLORS } from '@/constants';

interface ColorFilterCirclesProps {
  selected: string[];
  counts: Record<string, number>;
  onToggle: (code: string) => void;
}

export function ColorFilterCircles({ selected, counts, onToggle }: ColorFilterCirclesProps) {
  const isAll = selected.length === 0;
  const colorEntries = Object.entries(APPOINTMENT_CARD_COLORS);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        data-testid="filter-color-all"
        onClick={() => isAll || onToggle('__ALL__')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors',
          isAll ?
          'bg-primary text-white border-primary' :
          'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
        )}>
        
        <span className="w-4 h-4 rounded-full border border-gray-300 bg-white" />
        <span className="text-sm font-medium"></span>
      </button>
      {colorEntries.map(([code, color]) => {
        const isSelected = selected.includes(code);
        // Map border-l-* dot class to a bg-* class for the visible dot
        const dotClass = color.dot.replace('border-l-', 'bg-');
        return (
          <button
            key={code}
            type="button"
            data-testid={`filter-color-${code}`}
            onClick={() => onToggle(code)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors',
              isSelected ?
              'bg-primary text-white border-primary' :
              'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            )}>
            
            <span className={cn('w-4 h-4 rounded-full', dotClass)} />
            <span className="text-sm font-medium">{counts[code] ?? 0}</span>
          </button>);

      })}
    </div>);

}
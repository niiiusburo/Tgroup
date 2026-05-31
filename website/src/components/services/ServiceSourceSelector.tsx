import { useMemo } from 'react';
import { FileText } from 'lucide-react';
import { isUuid } from '@/lib/uuid';
import type { CustomerSource } from '@/types/settings';

interface ServiceSourceSelectorProps {
  readonly sources: readonly CustomerSource[];
  readonly value: string | null;
  readonly onChange: (sourceId: string | null) => void;
}

export function ServiceSourceSelector({ sources, value, onChange }: ServiceSourceSelectorProps) {
  const sourceOptions = useMemo(
    () => sources.filter((source) => isUuid(source.id)),
    [sources],
  );

  if (sourceOptions.length === 0) return null;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
        <FileText className="w-3.5 h-3.5" />
        Nguồn khách hàng
      </label>
      <div className="flex flex-wrap gap-2">
        {sourceOptions.map((source) => {
          const isSelected = value === source.id;
          return (
            <button
              key={source.id}
              type="button"
              onClick={() => onChange(isSelected ? null : source.id)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all border
                ${isSelected
                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300 hover:text-orange-600'}
              `}
            >
              {source.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

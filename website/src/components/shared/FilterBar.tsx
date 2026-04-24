/**
 * FilterBar — Shared filter bar component
 * Replaces duplicated filter bar UI across 7+ pages.
 * @crossref:used-in[Customers, Services, Employees, Locations, Payment, Website, Calendar]
 */
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusOptions?: FilterOption[];
  statusFilter?: string;
  onStatusChange?: (status: string) => void;
  extraFilters?: React.ReactNode;
  onClearAll?: () => void;
  hasActiveFilters?: boolean;
  placeholder?: string;
  className?: string;
}

export function FilterBar({
  searchTerm,
  onSearchChange,
  statusOptions,
  statusFilter = 'all',
  onStatusChange,
  extraFilters,
  onClearAll,
  hasActiveFilters = false,
  placeholder = 'Search...',
  className,
}: FilterBarProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Search row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
              'w-full bg-white border border-gray-200 rounded-xl text-sm text-gray-900',
              'placeholder:text-gray-400',
              'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15',
              'hover:border-gray-300',
              'transition-all duration-150',
              'py-2.5 pl-10 pr-4'
            )}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>

        {extraFilters}

        {hasActiveFilters && onClearAll && (
          <button
            type="button"
            onClick={onClearAll}
            className="px-3 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            Clear
          </button>
        )}
      </div>

      {/* Status filter chips */}
      {statusOptions && onStatusChange && (
        <div className="flex items-center gap-2 flex-wrap">
          {statusOptions.map((option) => {
            const isActive = option.value === statusFilter;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onStatusChange(option.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full',
                  'transition-all duration-150',
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                )}
              >
                {option.label}
                {option.count !== undefined && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px]',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-100 text-gray-500'
                    )}
                  >
                    {option.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

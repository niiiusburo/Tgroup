import { Stethoscope, X, ChevronDown, Search, Check } from 'lucide-react';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { cn, normalizeText } from '@/lib/utils';

/**
 * FilterByDoctor - Quick doctor filter dropdown for lists and calendar
 * @crossref:used-in[Calendar, Appointments, Employees]
 *
 * Redesigned as a custom searchable dropdown with keyboard navigation
 * and accessible markup.
 */

export interface DoctorOption {
  readonly id: string;
  readonly name: string;
  readonly roles?: string[];
}

interface FilterByDoctorProps {
  readonly selectedDoctorName: string | null;
  readonly onChange: (doctorName: string | null) => void;
  readonly doctors?: readonly DoctorOption[];
  readonly className?: string;
}

export function FilterByDoctor({ selectedDoctorName, onChange, doctors = [], className = '' }: FilterByDoctorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const availableDoctors = useMemo(
    () =>
      doctors.filter(
        (d) => d.roles === undefined || d.roles.some((r) => r === 'doctor'),
      ),
    [doctors],
  );

  const filteredDoctors = useMemo(() => {
    const term = normalizeText(query.trim());
    if (!term) return availableDoctors;
    return availableDoctors.filter((d) => normalizeText(d.name).includes(term));
  }, [availableDoctors, query]);

  const allOptionId = '__ALL__';
  const listItems = useMemo(
    () => [{ id: allOptionId, name: 'Tất cả bác sĩ' }, ...filteredDoctors],
    [filteredDoctors],
  );

  const selectedDoctor = availableDoctors.find((d) => d.name === selectedDoctorName);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset highlighted index when query or open state changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (id: string) => {
      if (id === allOptionId) {
        onChange(null);
      } else {
        onChange(id);
      }
      setIsOpen(false);
      setQuery('');
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev + 1 < listItems.length ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (listItems[highlightedIndex]) {
            handleSelect(listItems[highlightedIndex].id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
        case 'Tab':
          setIsOpen(false);
          break;
      }
    },
    [isOpen, listItems, highlightedIndex, handleSelect],
  );

  const displayLabel = selectedDoctor ? selectedDoctor.name : 'Bác sĩ';

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={cn(
            'flex items-center gap-2 min-w-[140px] max-w-[220px]',
            'pl-3 pr-2 py-1.5 text-sm font-medium rounded-lg border transition-colors',
            'bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            isOpen ? 'border-primary ring-1 ring-primary/20' : 'border-gray-200 text-gray-700',
          )}
        >
          <Stethoscope className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="truncate flex-1 text-left">{displayLabel}</span>
          <ChevronDown
            className={cn('w-4 h-4 text-gray-400 shrink-0 transition-transform', isOpen && 'rotate-180')}
          />
        </button>
        {selectedDoctorName && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear doctor filter"
            title="Clear doctor filter"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tìm bác sĩ..."
                className="w-full pl-7 pr-2 py-1.5 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div
            className="max-h-72 overflow-y-auto py-1"
            role="listbox"
            aria-label="Doctor filter options"
          >
            {listItems.map((item, index) => {
              const isSelected = item.id === allOptionId
                ? !selectedDoctorName
                : selectedDoctorName === item.name;
              const isHighlighted = index === highlightedIndex;

              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(item.id)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors',
                    isHighlighted ? 'bg-gray-100' : 'hover:bg-gray-50',
                    isSelected ? 'text-primary font-medium' : 'text-gray-700',
                  )}
                >
                  <span className="truncate">{item.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                </div>
              );
            })}

            {filteredDoctors.length === 0 && query.trim().length > 0 && (
              <div className="px-3 py-3 text-sm text-gray-400 text-center">Không tìm thấy bác sĩ</div>
            )}
          </div>

          <div className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100 bg-gray-50/50 text-center">
            {availableDoctors.length} bác sĩ
          </div>
        </div>
      )}
    </div>
  );
}

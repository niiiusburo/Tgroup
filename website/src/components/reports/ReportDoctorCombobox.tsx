import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn, normalizeText } from '@/lib/utils';

export interface ReportComboboxOption {
  id: string;
  label: string;
  subLabel?: string | null;
  searchText?: string | null;
}

interface ReportFilterComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ReportComboboxOption[];
  loading?: boolean;
  allLabel: string;
  loadingLabel: string;
  searchPlaceholder: string;
  noResultsLabel: string;
  clearLabel: string;
}

export interface ReportDoctorOption {
  id: string;
  name: string;
  ref?: string | null;
}

interface ReportDoctorComboboxProps {
  value: string;
  onChange: (value: string) => void;
  doctors: ReportDoctorOption[];
  loading?: boolean;
  allLabel: string;
  loadingLabel: string;
  searchPlaceholder: string;
  noResultsLabel: string;
  clearLabel: string;
}

export function ReportFilterCombobox({
  value,
  onChange,
  options,
  loading = false,
  allLabel,
  loadingLabel,
  searchPlaceholder,
  noResultsLabel,
  clearLabel,
}: ReportFilterComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const term = normalizeText(query.trim());
    if (!term) return options;

    return options.filter((option) =>
      normalizeText(`${option.label} ${option.subLabel ?? ''} ${option.searchText ?? ''}`).includes(term)
    );
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    }

    if (!isOpen) return;
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className="relative min-w-[220px] flex-1 sm:flex-none">
      <button
        type="button"
        disabled={loading}
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-left text-sm transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary hover:border-gray-300',
          selectedOption && 'pr-9',
          loading && 'cursor-not-allowed bg-gray-50 text-gray-400'
        )}
      >
        <span className={cn('flex-1 truncate', selectedOption ? 'text-gray-900' : 'text-gray-700')}>
          {loading ? loadingLabel : selectedOption ? selectedOption.label : allLabel}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {selectedOption && !loading ? (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => handleSelect('all')}
          className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 bg-gray-50/60 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>
          </div>

          <div role="listbox" className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              role="option"
              aria-selected={value === 'all'}
              onClick={() => handleSelect('all')}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors',
                value === 'all' ? 'bg-primary/5 font-medium text-primary' : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <span className="truncate">{allLabel}</span>
              {value === 'all' ? <Check className="ml-2 h-4 w-4 shrink-0 text-primary" /> : null}
            </button>

            {filteredOptions.map((option) => {
              const isSelected = option.id === value;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.id)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors',
                    isSelected ? 'bg-primary/5 font-medium text-primary' : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.subLabel ? <span className="block truncate text-xs text-gray-400">{option.subLabel}</span> : null}
                  </span>
                  {isSelected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                </button>
              );
            })}

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-sm text-gray-400">{noResultsLabel}</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ReportDoctorCombobox({
  doctors,
  ...props
}: ReportDoctorComboboxProps) {
  const options = useMemo(
    () =>
      doctors.map((doctor) => ({
        id: doctor.id,
        label: doctor.name,
        subLabel: doctor.ref ?? null,
        searchText: doctor.ref ?? null,
      })),
    [doctors]
  );

  return <ReportFilterCombobox {...props} options={options} />;
}

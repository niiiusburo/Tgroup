/**
 * StatusDropdown - Clickable status badge with dropdown to change status
 * @crossref:used-in[ServiceHistoryList, ServiceHistory]
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface StatusOption {
  readonly value: string;
  readonly label: string;
  readonly style: string; // tailwind classes for the badge
}

interface StatusDropdownProps {
  readonly current: string;
  readonly options: readonly StatusOption[];
  readonly onChange: (newStatus: string) => Promise<unknown> | void;
  readonly disabled?: boolean;
}

export function StatusDropdown({ current, options, onChange, disabled = false }: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const currentOption = options.find((o) => o.value === current);
  const currentStyle = currentOption?.style ?? 'bg-gray-100 text-gray-700';
  const currentLabel = currentOption?.label ?? current;

  async function handleSelect(value: string) {
    if (value === current) {
      setOpen(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onChange(value);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={(e) => { e.stopPropagation(); setOpen((prev) => !prev); }}
        className={`
          inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium
          transition-colors cursor-pointer select-none
          ${currentStyle}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}
          ${loading ? 'animate-pulse' : ''}
        `}
      >
        {loading ? '...' : currentLabel}
        {!disabled && <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />}
      </button>

      {open && !disabled && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px] animate-in fade-in-0 zoom-in-95 duration-100">
          {error && (
            <div className="px-3 py-1.5 text-[10px] text-red-600 bg-red-50 border-b border-red-100">
              {error}
            </div>
          )}
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={(e) => { e.stopPropagation(); handleSelect(opt.value); }}
              className={`
                w-full text-left px-3 py-1.5 text-xs font-medium flex items-center gap-2
                transition-colors
                ${opt.value === current ? 'bg-gray-50 text-gray-400' : 'text-gray-700 hover:bg-gray-50'}
              `}
              disabled={opt.value === current}
            >
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${opt.style}`}>
                {opt.label}
              </span>
              {opt.value === current && (
                <span className="text-gray-400 text-[10px] ml-auto">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

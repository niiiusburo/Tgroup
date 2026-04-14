/**
 * StatusDropdown - Clickable status badge with dropdown to change status
 * @crossref:used-in[ServiceHistoryList, ServiceHistory]
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

export interface StatusOption {
  readonly value: string;
  readonly label: string; // Can be i18n key like 'completed' or direct string
  readonly style: string; // tailwind classes for the badge
}

interface StatusDropdownProps {
  readonly current: string;
  readonly options: readonly StatusOption[];
  readonly onChange: (newStatus: string) => Promise<unknown> | void;
  readonly disabled?: boolean;
  readonly namespace?: string;
}

export function StatusDropdown({ current, options, onChange, disabled = false, namespace = 'common' }: StatusDropdownProps) {
  const { t } = useTranslation(namespace);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Translate label - use t() if label looks like a key, otherwise use directly
  const translateLabel = (label: string) => {
    // If label contains dots (i18n key format), try translating
    if (label.includes('.')) {
      const translated = t(label);
      // If translation returns same key, use original
      return translated === label ? label : translated;
    }
    // If label looks like an i18n key (snake_case, no spaces, starts with lowercase)
    // e.g., 'completed', 'active', 'pending'
    if (label.length > 0 && label.length < 30 && !label.includes(' ') && /^[a-z][a-z0-9_]*$/.test(label)) {
      const translated = t(label);
      // If translation returns same key (not found), use original
      return translated === label ? label : translated;
    }
    // Otherwise, return as-is (already human-readable text like 'In Progress', 'Hoàn thành', etc.)
    return label;
  };

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
  const currentLabel = translateLabel(currentOption?.label ?? current);

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
        {loading ? '...' : translateLabel(currentLabel)}
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
                {translateLabel(opt.label)}
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

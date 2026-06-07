import { Stethoscope, Sparkles, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { BusinessUnit } from '@/contexts/BusinessUnitContext';

/**
 * FilterByBusinessUnit - LOB (Dental / Cosmetic) toggle dropdown
 * Placed immediately left of FilterByLocation in header for Admin users with multi-LOB scope.
 * Mirrors FilterByLocation styling and interaction exactly.
 * Visible only when the parent BusinessUnitContext reports an Admin multi-LOB user.
 *
 * @crossref:used-in[Layout]
 * Part of Cosmetic LOB v2 foundation (Phase 0/1)
 */
interface FilterByBusinessUnitProps {
  readonly current: BusinessUnit;
  readonly available: readonly BusinessUnit[];
  readonly onChange: (lob: BusinessUnit) => void;
}

const LOB_LABELS: Record<BusinessUnit, string> = {
  dental: 'Dental',
  cosmetic: 'Cosmetic',
};

const LOB_ICONS: Record<BusinessUnit, React.ComponentType<{ className?: string }>> = {
  dental: Stethoscope,
  cosmetic: Sparkles,
};

export function FilterByBusinessUnit({
  current,
  available,
  onChange,
}: FilterByBusinessUnitProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation('common');
  // Localized LOB label, falling back to the English constant if a key is missing.
  const lobLabel = (lob: BusinessUnit) => t(`lob.${lob}`, LOB_LABELS[lob]);

  const CurrentIcon = LOB_ICONS[current] ?? Stethoscope;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Only show options that are available (defensive)
  const options = available.filter((lob) => lob === 'dental' || lob === 'cosmetic');

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="
          flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg border border-gray-200
          bg-white hover:bg-gray-50 transition-colors duration-150
          text-sm font-medium text-gray-700
        "
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={lobLabel(current)}
      >
        <CurrentIcon className="w-4 h-4 text-gray-400" />
        <span className="hidden sm:inline">{lobLabel(current)}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          role="listbox"
        >
          {options.map((lob) => {
            const Icon = LOB_ICONS[lob];
            const isActive = lob === current;
            return (
              <button
                key={lob}
                onClick={() => {
                  onChange(lob);
                  setIsOpen(false);
                }}
                className={`
                  w-full text-left px-4 py-2 text-sm transition-colors duration-150 flex items-center gap-2
                  ${isActive
                    ? 'bg-primary/5 text-primary font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
                role="option"
                aria-selected={isActive}
              >
                <Icon className="w-4 h-4 text-gray-400" />
                <span>{lobLabel(lob)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

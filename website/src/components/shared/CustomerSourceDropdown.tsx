import { Megaphone, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { CUSTOMER_SOURCES } from '@/data/mockCustomerForm';

/**
 * CustomerSourceDropdown - How the customer found the clinic
 * @crossref:used-in[CustomerForm, Reports]
 */

interface CustomerSourceDropdownProps {
  readonly selectedId: string;
  readonly onChange: (sourceId: string) => void;
  readonly disabled?: boolean;
  readonly error?: string;
}

export function CustomerSourceDropdown({
  selectedId,
  onChange,
  disabled = false,
  error,
}: CustomerSourceDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedSource = CUSTOMER_SOURCES.find((s) => s.id === selectedId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1">
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => {
            if (!disabled) setIsOpen((prev) => !prev);
          }}
          disabled={disabled}
          className={`
            flex items-center gap-2 w-full px-3 py-2 rounded-lg border
            text-sm text-left transition-colors duration-150
            ${disabled
              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
              : error
                ? 'bg-white border-red-400 text-gray-700 cursor-pointer'
                : 'bg-white border-gray-300 hover:border-gray-400 text-gray-700 cursor-pointer'
            }
          `}
        >
          <Megaphone className="w-4 h-4 text-gray-400 shrink-0" />
          <span className={`flex-1 truncate ${selectedSource ? '' : 'text-gray-400'}`}>
            {selectedSource?.label ?? 'How did you hear about us?'}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-h-48 overflow-y-auto">
            {CUSTOMER_SOURCES.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => {
                  onChange(source.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full text-left px-4 py-2 text-sm transition-colors duration-150
                  ${source.id === selectedId
                    ? 'bg-primary/5 text-primary font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {source.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

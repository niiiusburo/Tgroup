import { MapPin, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { LocationOption } from '@/types/common';

/**
 * LocationSelector - Branch/location selector dropdown
 * @crossref:used-in[CustomerForm, EmployeeForm, AppointmentForm, ServiceForm]
 */

interface LocationSelectorProps {
  readonly locations: readonly LocationOption[];
  readonly selectedId: string | null;
  readonly onChange: (locationId: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly excludeAll?: boolean;
}

export function LocationSelector({
  locations,
  selectedId,
  onChange,
  placeholder = 'Select location...',
  disabled = false,
  excludeAll = false,
}: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayLocations = excludeAll
    ? locations.filter((l) => l.id !== 'all')
    : locations;

  const selectedLocation = locations.find((l) => l.id === selectedId);

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
            : 'bg-white border-gray-300 hover:border-gray-400 text-gray-700 cursor-pointer'
          }
        `}
      >
        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
        <span className={`flex-1 truncate ${selectedLocation ? '' : 'text-gray-400'}`}>
          {selectedLocation?.name ?? placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {displayLocations.map((location) => (
            <button
              key={location.id}
              type="button"
              onClick={() => {
                onChange(location.id);
                setIsOpen(false);
              }}
              className={`
                w-full text-left px-4 py-2 text-sm transition-colors duration-150
                ${location.id === selectedId
                  ? 'bg-primary/5 text-primary font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              {location.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

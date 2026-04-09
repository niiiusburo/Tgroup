import { MapPin, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { LocationOption } from '@/types/common';

/**
 * FilterByLocation - Location filter dropdown
 * @crossref:used-in[Overview, Calendar, Customers, Appointments, Employees]
 */

interface FilterByLocationProps {
  readonly locations: readonly LocationOption[];
  readonly selectedId: string;
  readonly onChange: (locationId: string) => void;
}

export function FilterByLocation({
  locations,
  selectedId,
  onChange,
}: FilterByLocationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        onClick={() => setIsOpen((prev) => !prev)}
        className="
          flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200
          bg-white hover:bg-gray-50 transition-colors duration-150
          text-sm font-medium text-gray-700
        "
      >
        <MapPin className="w-4 h-4 text-gray-400" />
        <span>{selectedLocation?.name ?? 'All Locations'}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {locations.map((location) => (
            <button
              key={location.id}
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

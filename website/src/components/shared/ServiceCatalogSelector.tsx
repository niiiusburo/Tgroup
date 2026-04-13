/**
 * ServiceCatalogSelector - Searchable service catalog dropdown
 * @crossref:used-in[ServiceForm, Settings, Website]
 */

import { Search, ChevronDown, Stethoscope } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { normalizeText } from '@/lib/utils';
import type { ServiceCatalogItem } from '@/data/mockServices';
import { APPOINTMENT_TYPE_LABELS, type AppointmentType } from '@/constants';
import { formatVND } from '@/lib/formatting';

interface ServiceCatalogSelectorProps {
  readonly catalog: readonly ServiceCatalogItem[];
  readonly selectedId: string | null;
  readonly onChange: (itemId: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly filterCategory?: AppointmentType;
}

export function ServiceCatalogSelector({
  catalog,
  selectedId,
  onChange,
  placeholder = 'Select service...',
  disabled = false,
  filterCategory,
}: ServiceCatalogSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedItem = catalog.find((c) => c.id === selectedId);

  const filteredItems = useMemo(() => {
    let items = filterCategory
      ? catalog.filter((c) => c.category === filterCategory)
      : [...catalog];

    if (searchTerm) {
      const norm = normalizeText(searchTerm);
      items = items.filter(
        (c) =>
          normalizeText(c.name).includes(norm) ||
          normalizeText(c.description).includes(norm) ||
          normalizeText(APPOINTMENT_TYPE_LABELS[c.category]).includes(norm),
      );
    }
    return items;
  }, [catalog, searchTerm, filterCategory]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => { if (!disabled) setIsOpen((prev) => !prev); }}
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
        <Stethoscope className="w-4 h-4 text-gray-400 shrink-0" />
        <span className={`flex-1 truncate ${selectedItem ? '' : 'text-gray-400'}`}>
          {selectedItem?.name ?? placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search services..."
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredItems.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">No services found</div>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`
                    w-full text-left px-4 py-2 text-sm transition-colors duration-150
                    ${item.id === selectedId
                      ? 'bg-primary/5 text-primary font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs text-gray-400">{formatVND(item.defaultPrice)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span>{APPOINTMENT_TYPE_LABELS[item.category]}</span>
                    <span>&middot;</span>
                    <span>{item.totalVisits} visit{item.totalVisits > 1 ? 's' : ''}</span>
                    <span>&middot;</span>
                    <span>{item.estimatedDuration}min</span>
                    {item.unit && (
                      <>
                        <span>&middot;</span>
                        <span>{item.unit}</span>
                      </>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

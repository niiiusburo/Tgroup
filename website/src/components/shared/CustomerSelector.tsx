import { Search, User, ChevronDown, Plus } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { normalizeText } from '@/lib/utils';
import type { Customer } from '@/types/customer';

/**
 * CustomerSelector - Searchable customer dropdown
 * @crossref:used-in[AppointmentForm, ServiceForm, PaymentForm]
 */

interface CustomerSelectorProps {
  readonly customers: readonly Customer[];
  readonly selectedId: string | null;
  readonly onChange: (customerId: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly onCreateNew?: () => void;
}

export function CustomerSelector({
  customers,
  selectedId,
  onChange,
  placeholder = 'Select customer...',
  disabled = false,
  loading = false,
  onCreateNew
}: CustomerSelectorProps) {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCustomer = customers.find((c) => c.id === selectedId);
  const isDisabled = disabled || loading;

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const norm = normalizeText(searchTerm);
    return customers.filter(
      (c) =>
      normalizeText(c.name).includes(norm) ||
      normalizeText(c.phone).includes(norm) ||
      normalizeText(c.email).includes(norm)
    );
  }, [customers, searchTerm]);

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
        onClick={() => {
          if (!isDisabled) setIsOpen((prev) => !prev);
        }}
        disabled={isDisabled}
        className={`
          flex items-center gap-2 w-full px-3 py-2 rounded-lg border
          text-sm text-left transition-colors duration-150
          ${isDisabled ?
        'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' :
        'bg-white border-gray-300 hover:border-gray-400 text-gray-700 cursor-pointer'}
        `
        }>
        
        <User className="w-4 h-4 text-gray-400 shrink-0" />
        <span className={`flex-1 truncate ${selectedCustomer ? '' : 'text-gray-400'}`}>
          {loading ? 'Loading customers...' : selectedCustomer?.name ?? placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen &&
      <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchByNamePhoneEmail', 'Tìm theo tên, SĐT, email...')}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
            
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filteredCustomers.length === 0 ?
          <div className="px-4 py-3 text-sm text-gray-400 text-center">{t('khngTmThyKhchHng')}</div> :

          filteredCustomers.map((customer) =>
          <button
            key={customer.id}
            type="button"
            onClick={() => {
              onChange(customer.id);
              setIsOpen(false);
              setSearchTerm('');
            }}
            className={`
                    w-full text-left px-4 py-2 text-sm transition-colors duration-150
                    ${customer.id === selectedId ?
            'bg-primary/5 text-primary font-medium' :
            'text-gray-700 hover:bg-gray-50'}
                  `
            }>
            
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-xs text-gray-400">{customer.phone} · {customer.email}</div>
                </button>
          )
          }
          </div>
          {onCreateNew &&
        <div className="border-t border-gray-100 p-2">
              <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setSearchTerm('');
              onCreateNew();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
            
                <Plus className="w-4 h-4" />

          </button>
            </div>
        }
        </div>
      }
    </div>);

}

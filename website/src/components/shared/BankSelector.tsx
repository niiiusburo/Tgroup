/**
 * BankSelector - Searchable Vietnamese bank dropdown
 * @crossref:used-in[BankSettingsForm]
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronDown, X, Check, Loader2, Landmark } from 'lucide-react';
import { normalizeText } from '@/lib/utils';

export interface Bank {
  id: string;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
  transferSupported: number;
  lookupSupported: number;
}

interface BankSelectorProps {
  value: string;
  onChange: (bin: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function BankSelector({
  value,
  onChange,
  placeholder = 'Chọn ngân hàng...',
  disabled = false,
  className = '',
}: BankSelectorProps) {
  const { t } = useTranslation('settings');
  const [banks, setBanks] = useState<readonly Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('https://api.vietqr.io/v2/banks')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data && Array.isArray(data.data)) {
          setBanks(data.data);
        }
      })
      .catch(() => {
        // ignore fetch errors
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedBank = useMemo(
    () => banks.find((b) => b.bin === value) || null,
    [banks, value],
  );

  const filteredBanks = useMemo(() => {
    if (!searchTerm) return banks;
    const norm = normalizeText(searchTerm);
    return banks.filter(
      (b) =>
        normalizeText(b.name).includes(norm) ||
        normalizeText(b.shortName).includes(norm) ||
        normalizeText(b.bin).includes(norm) ||
        normalizeText(b.code).includes(norm),
    );
  }, [banks, searchTerm]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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

  const handleSelect = (bank: Bank) => {
    onChange(bank.bin);
    setIsOpen(false);
    setSearchTerm('');
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const displayLabel = selectedBank
    ? `${selectedBank.shortName} - ${selectedBank.name}`
    : '';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        {/* Left icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {selectedBank ? (
            <img
              src={selectedBank.logo}
              alt=""
              className="h-5 w-auto object-contain"
            />
          ) : (
            <Landmark className="w-4 h-4 text-gray-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : displayLabel}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (!isOpen && selectedBank) {
              setSearchTerm(selectedBank.shortName);
            } else if (!isOpen) {
              setSearchTerm('');
            }
          }}
          placeholder={placeholder}
          disabled={disabled || loading}
          className={`
            w-full pl-10 pr-10 py-2 rounded-lg border text-sm
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            transition-colors
            ${disabled || loading ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-900'}
          `}
        />

        {/* Right controls */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {(value || searchTerm) && !disabled && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
              aria-label="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen((s) => !s)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
            aria-label="Toggle dropdown"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Search box inside dropdown */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('bankSettingsContent.selectBank', { ns: 'settings' })}
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                autoFocus
              />
            </div>
          </div>

          {/* Results list */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredBanks.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">
                Không tìm thấy ngân hàng
              </div>
            ) : (
              filteredBanks.map((bank) => {
                const isSelected = bank.bin === value;
                return (
                  <button
                    key={bank.id}
                    type="button"
                    onClick={() => handleSelect(bank)}
                    className={`
                      w-full text-left px-3 py-2 flex items-center gap-3 transition-colors
                      ${isSelected ? 'bg-primary/5' : 'hover:bg-gray-50'}
                    `}
                  >
                    <div className="w-8 h-8 shrink-0 bg-white rounded border border-gray-100 flex items-center justify-center p-0.5">
                      <img
                        src={bank.logo}
                        alt={bank.shortName}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-gray-900'}`}
                        >
                          {bank.shortName}
                        </span>
                        <span className="text-xs text-gray-400 truncate">
                          {bank.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400">
                        BIN: {bank.bin}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { Handshake, ChevronDown, Search } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { normalizeText } from '@/lib/utils';
import type { CtvOption } from '@/lib/api/ctv';

/**
 * CtvSelector — searchable dropdown for picking a CTV (Cộng tác viên) commission referrer.
 * Mirrors DoctorSelector's interaction model. Selecting a CTV assigns them as the customer's
 * referred_by_ctv_id (handled server-side); deselecting only clears the local choice and is a
 * server-side no-op (it never wipes an existing referrer).
 * @crossref:used-in[ServiceForm, AppointmentStaffFields]
 */

interface CtvSelectorProps {
  readonly ctvs: readonly CtvOption[];
  readonly selectedId: string | null;
  readonly onChange: (ctvId: string | null) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly allowClear?: boolean;
}

export function CtvSelector({
  ctvs,
  selectedId,
  onChange,
  placeholder,
  disabled = false,
  loading = false,
  allowClear = true,
}: CtvSelectorProps) {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = ctvs.find((c) => c.id === selectedId);
  const isDisabled = disabled || loading;
  const resolvedPlaceholder = placeholder ?? t('selectCtv', 'Chọn cộng tác viên...');

  const filtered = useMemo(() => {
    if (!searchTerm) return ctvs;
    const norm = normalizeText(searchTerm);
    return ctvs.filter(
      (c) =>
        normalizeText(c.name).includes(norm) ||
        normalizeText(c.phone ?? '').includes(norm),
    );
  }, [ctvs, searchTerm]);

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
    if (isOpen && inputRef.current) inputRef.current.focus();
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
          ${isDisabled
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white border-gray-300 hover:border-gray-400 text-gray-700 cursor-pointer'}
        `}
      >
        <Handshake className="w-4 h-4 text-gray-400 shrink-0" />
        <span className={`flex-1 truncate ${selected ? '' : 'text-gray-400'}`}>
          {loading ? t('loading', 'Loading...') : selected?.name ?? resolvedPlaceholder}
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
                placeholder={t('searchByNameOrPhone', 'Tìm theo tên hoặc số điện thoại...')}
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {allowClear && (
              <button
                key="__clear__"
                type="button"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`
                  w-full text-left px-4 py-2 text-sm font-medium transition-colors duration-150 border-b border-gray-100
                  ${selected ? 'text-red-600 hover:bg-red-50' : 'text-gray-500 hover:bg-gray-50'}
                `}
              >
                {t('clearSelection', 'Không chọn (None)')}
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">
                {t('noCtvsFound', 'Không tìm thấy cộng tác viên')}
              </div>
            ) : (
              filtered.map((ctv) => (
                <button
                  key={ctv.id}
                  type="button"
                  onClick={() => {
                    onChange(ctv.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`
                    w-full text-left px-4 py-2 text-sm transition-colors duration-150
                    ${ctv.id === selectedId
                      ? 'bg-primary/5 text-primary font-medium'
                      : 'text-gray-700 hover:bg-gray-50'}
                  `}
                >
                  <div className="font-medium">{ctv.name}</div>
                  {ctv.phone && <div className="text-xs text-gray-400">{ctv.phone}</div>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

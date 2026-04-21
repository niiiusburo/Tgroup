import { Stethoscope, ChevronDown, Search } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { normalizeText } from '@/lib/utils';
import type { Employee } from '@/data/mockEmployees';
import { ROLE_LABELS } from '@/data/mockEmployees';

/**
 * DoctorSelector - Doctor/employee dropdown with search
 * @crossref:used-in[AppointmentForm, ServiceForm, CalendarFilter]
 */

interface DoctorSelectorProps {
  readonly employees: readonly Employee[];
  readonly selectedId: string | null;
  readonly onChange: (employeeId: string | null) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly filterRoles?: readonly string[];
  readonly allowClear?: boolean;
}

export function DoctorSelector({
  employees,
  selectedId,
  onChange,
  placeholder = 'Select doctor...',
  disabled = false,
  filterRoles,
  allowClear = false
}: DoctorSelectorProps) {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableEmployees = useMemo(() => {
    const filtered = filterRoles ?
    employees.filter((e) => e.roles.some((r) => filterRoles.includes(r))) :
    employees;
    return filtered.filter((e) => e.status === 'active');
  }, [employees, filterRoles]);

  const selectedEmployee = employees.find((e) => e.id === selectedId);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return availableEmployees;
    const norm = normalizeText(searchTerm);
    return availableEmployees.filter(
      (e) =>
      normalizeText(e.name).includes(norm) ||
      e.roles.some((r) => normalizeText(t(ROLE_LABELS[r], r)).includes(norm))
    );
  }, [availableEmployees, searchTerm]);

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
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        disabled={disabled}
        className={`
          flex items-center gap-2 w-full px-3 py-2 rounded-lg border
          text-sm text-left transition-colors duration-150
          ${disabled ?
        'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' :
        'bg-white border-gray-300 hover:border-gray-400 text-gray-700 cursor-pointer'}
        `
        }>
        
        <Stethoscope className="w-4 h-4 text-gray-400 shrink-0" />
        <span className={`flex-1 truncate ${selectedEmployee ? '' : 'text-gray-400'}`}>
          {selectedEmployee?.name ?? placeholder}
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
              placeholder={t('searchByNameOrRole', 'Tìm theo tên hoặc vai trò...')}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
            
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {allowClear && selectedEmployee &&
          <button
            key="__clear__"
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
              setSearchTerm('');
            }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-b border-gray-100">
            {t('clearSelection', 'Bỏ chọn')}
          </button>
          }
            {filteredEmployees.length === 0 ?
          <div className="px-4 py-3 text-sm text-gray-400 text-center">{t('noDoctorsFound', 'Không tìm thấy bác sĩ')}</div> :

          filteredEmployees.map((employee) =>
          <button
            key={employee.id}
            type="button"
            onClick={() => {
              onChange(employee.id);
              setIsOpen(false);
              setSearchTerm('');
            }}
            className={`
                    w-full text-left px-4 py-2 text-sm transition-colors duration-150
                    ${employee.id === selectedId ?
            'bg-primary/5 text-primary font-medium' :
            'text-gray-700 hover:bg-gray-50'}
                  `
            }>
            
                  <div className="font-medium">{employee.name}</div>
                  <div className="text-xs text-gray-400">
                    {employee.roles.map((r) => t(ROLE_LABELS[r], r)).join(', ')}
                  </div>
                </button>
          )
          }
          </div>
        </div>
      }
    </div>);

}
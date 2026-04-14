import { Search, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * SearchBar - Debounced search input with icon
 * @crossref:used-in[Customers, Employees, Services, Website]
 */

interface SearchBarProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly debounceMs?: number;
}

export function SearchBar({
  value,
  onChange,
  placeholder = '',
  debounceMs = 300,
}: SearchBarProps) {
  const { t } = useTranslation();
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleChange(newValue: string) {
    setLocalValue(newValue);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  }

  function handleClear() {
    setLocalValue('');
    onChange('');
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder || t('search')}
        className="
          w-full pl-9 pr-9 py-2 rounded-lg border border-gray-200
          bg-white text-sm text-gray-700 placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
          transition-colors duration-150
        "
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

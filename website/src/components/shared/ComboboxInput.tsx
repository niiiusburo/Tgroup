import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { normalizeText } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface ComboboxInputProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ComboboxInput({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className = ''
}: ComboboxInputProps) {
  const { t } = useTranslation('common');
  const resolvedPlaceholder = placeholder ?? t('combobox.placeholder');
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Sync input value with prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filter options based on input
  const filteredOptions = options.filter((option) =>
  normalizeText(option).includes(normalizeText(inputValue))
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSelect = (option: string) => {
    setInputValue(option);
    onChange(option);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue('');
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={resolvedPlaceholder}
          disabled={disabled}
          className={`
            w-full px-4 py-3 pr-10 bg-white border border-gray-200 rounded-xl 
            text-sm text-gray-900 placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 
            transition-all hover:border-gray-300
            ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}
          `} />
        
        
        {/* Dropdown arrow */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          tabIndex={-1}>
          
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Clear button */}
        {inputValue && !disabled &&
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          tabIndex={-1}>
          
            <X className="w-4 h-4" />
          </button>
        }
      </div>

      {/* Dropdown */}
      {isOpen && filteredOptions.length > 0 &&
      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[100] max-h-60 overflow-y-auto">
          {filteredOptions.map((option) =>
        <button
          key={option}
          type="button"
          onClick={() => handleSelect(option)}
          className={`
                w-full px-4 py-2.5 text-left text-sm transition-colors
                ${normalizeText(option) === normalizeText(inputValue) ?
          'bg-orange-50 text-orange-700 font-medium' :
          'hover:bg-gray-50 text-gray-700'}
              `}>
          
              {option}
            </button>
        )}
        </div>
      }

      {/* No results */}
      {isOpen && inputValue && filteredOptions.length === 0 &&
      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 p-3 z-[100]">
          <p className="text-sm text-gray-500 text-center">

        </p>
        </div>
      }
    </div>);

}

export default ComboboxInput;
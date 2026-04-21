import { useRef } from 'react';
import { formatVNDInput, parseVND } from '@/lib/formatting';

export interface CurrencyInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  'aria-label'?: string;
}

const BLOCKED_KEYS = new Set(['.', ',', '-', '+', 'e', 'E']);

export function CurrencyInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  autoFocus,
  id,
  name,
  ...rest
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const display = formatVNDInput(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (digits.length === 0) {
      onChange(null);
      return;
    }
    onChange(Number(digits));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (BLOCKED_KEYS.has(e.key)) {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    const parsed = parseVND(text);
    if (parsed === null) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    onChange(parsed);
  };

  return (
    <div className={`relative ${className ?? ''}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        id={id}
        name={name}
        aria-label={rest['aria-label']}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 pr-10 text-right text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:bg-gray-50 disabled:text-gray-500"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
        ₫
      </span>
    </div>
  );
}

export default CurrencyInput;

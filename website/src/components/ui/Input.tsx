/**
 * Input — Primitive UI component
 * Standardized text input with consistent focus ring, sizing, and label support.
 * @crossref:used-in[all forms, all modals]
 */
import { cn } from '@/lib/utils';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export function Input({
  label,
  error,
  hint,
  icon,
  iconRight,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || (label ? `input-${Math.random().toString(36).slice(2, 9)}` : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full bg-white border rounded-xl text-sm text-gray-900',
            'placeholder:text-gray-400',
            'transition-all duration-150 ease-out',
            'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            icon ? 'pl-10' : 'pl-4',
            iconRight ? 'pr-10' : 'pr-4',
            'py-2.5',
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-500/15'
              : 'border-gray-200 hover:border-gray-300',
            className
          )}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {iconRight}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}

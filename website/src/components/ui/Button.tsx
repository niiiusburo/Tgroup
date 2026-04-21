/**
 * Button — Primitive UI component
 * Standardized button with consistent variants, sizes, and interaction states.
 * @crossref:used-in[all modals, all forms, all pages]
 */
import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-dark active:bg-primary-dark ' +
    'focus:ring-2 focus:ring-primary/30 focus:ring-offset-1 ' +
    'shadow-sm hover:shadow-md',
  secondary:
    'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:bg-gray-100 ' +
    'focus:ring-2 focus:ring-gray-200 focus:ring-offset-1',
  ghost:
    'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 ' +
    'focus:ring-2 focus:ring-gray-200',
  destructive:
    'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 ' +
    'focus:ring-2 focus:ring-red-500/30 focus:ring-offset-1 ' +
    'shadow-sm hover:shadow-md',
  outline:
    'bg-transparent text-primary border border-primary hover:bg-primary/5 ' +
    'focus:ring-2 focus:ring-primary/20',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-9 px-4 text-sm rounded-lg gap-2',
  lg: 'h-11 px-6 text-sm rounded-xl gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium',
        'transition-all duration-150 ease-out',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-[0.98]',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}

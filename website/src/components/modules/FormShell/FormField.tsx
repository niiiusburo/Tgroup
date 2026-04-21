/**
 * FormField — Label + input compound component for TG Clinic modal forms.
 *
 * Provides the canonical form field pattern:
 * - Label with optional icon (uppercase, semibold, gray-500)
 * - Input/selector slot
 * - Error message display
 *
 * USAGE:
 * <FormField
 *   label="Customer Name"
 *   icon={<User className="w-3.5 h-3.5" />}
 *   error={errors.customer}
 * >
 *   <CustomerSelector ... />
 * </FormField>
 *
 * @crossref:used-in[FormShell, AddCustomerForm, ServiceForm, AppointmentForm]
 */

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FormFieldProps {
  label: string;
  icon?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  layout?: 'vertical' | 'horizontal';
}

export function FormField({
  label,
  icon,
  error,
  required = false,
  children,
  className,
  layout = 'vertical',
}: FormFieldProps) {
  return (
    <div className={cn('flex gap-4', className)}>
      {layout === 'horizontal' ? (
        <>
          <div className="w-32 flex-shrink-0 pt-3">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {icon && <span className="text-gray-400">{icon}</span>}
              {label}
              {required && <span className="text-red-500">*</span>}
            </label>
          </div>
          <div className="flex-1 min-w-0">
            {children}
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
          </div>
        </>
      ) : (
        <>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            {icon && <span className="text-gray-400">{icon}</span>}
            {label}
            {required && <span className="text-red-500">*</span>}
          </label>
          {children}
          {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </>
      )}
    </div>
  );
}

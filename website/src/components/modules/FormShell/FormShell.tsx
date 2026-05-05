/**
 * FormShell — Unified modal shell for all TG Clinic form modals.
 *
 * This component provides the canonical TG Clinic modal wrapper:
 * - Orange gradient header with icon + title + subtitle + X button
 * - Scrollable body content
 * - Footer with Cancel + Save buttons
 * - Backdrop with click-to-close
 *
 * USAGE:
 * <FormShell onClose={handleClose}>
 *   <FormHeader title="Add Customer" subtitle="Create new customer" icon={<UserPlus />} />
 *   <div className="p-6">...form fields...</div>
 *   <FormFooter onCancel={handleClose} onSubmit={handleSubmit} />
 * </FormShell>
 *
 * @crossref:used-in[AddCustomerForm, ServiceForm, AppointmentForm, EmployeeForm, PaymentForm]
 */

import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface FormShellProps {
  children: ReactNode;
  onClose: () => void;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  showBackdrop?: boolean;
  closeOnBackdrop?: boolean;
}

const MAX_WIDTH_MAP = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-4xl',
  '3xl': 'max-w-5xl',
  '4xl': 'max-w-6xl',
};

export function FormShell({
  children,
  onClose,
  className,
  maxWidth = 'lg',
  showBackdrop = true,
  closeOnBackdrop = true,
}: FormShellProps) {
  const modal = (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden p-0 sm:items-center sm:p-4">
      {/* Backdrop */}
      {showBackdrop && (
        <div
          className="absolute inset-0 bg-black/40"
          onClick={closeOnBackdrop ? onClose : undefined}
          aria-hidden="true"
        />
      )}

      {/* Modal Content */}
      <div
        className={cn(
          'relative bg-white rounded-none shadow-2xl w-full sm:rounded-2xl',
          'flex flex-col',
          'animate-in fade-in zoom-in-95 duration-200',
          'h-[100dvh] max-h-[100dvh] min-h-0 sm:h-auto sm:max-h-[90vh]',
          MAX_WIDTH_MAP[maxWidth],
          className
        )}
      >
        {children}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modal, document.body);
  }
  return modal;
}

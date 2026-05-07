/**
 * FormFooter — Footer buttons for TG Clinic modal forms.
 *
 * Provides the canonical footer pattern:
 * - Cancel button (outlined, gray)
 * - Save/Submit button (orange, rounded-xl, with optional loading spinner)
 *
 * USAGE:
 * <FormFooter
 *   onCancel={handleClose}
 *   onSubmit={handleSubmit}
 *   isSubmitting={isLoading}
 *   isEdit={isEditing}
 *   submitLabel="Save"
 * />
 *
 * @crossref:used-in[FormShell, AddCustomerForm, ServiceForm, AppointmentForm]
 */

import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface FormFooterProps {
  onCancel: () => void;
  onSubmit?: () => void;
  form?: string; // HTML form id to submit (when inside a <form>, use this instead of onClick)
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  isEdit?: boolean;
  submitDisabled?: boolean;
  className?: string;
  showSubmit?: boolean;
}

export function FormFooter({
  onCancel,
  onSubmit,
  form,
  submitLabel,
  cancelLabel,
  isSubmitting = false,
  isEdit = false,
  submitDisabled = false,
  className,
  showSubmit = true,
}: FormFooterProps) {
  const { t } = useTranslation('common');
  const canSubmit = onSubmit || form;
  const resolvedSubmitLabel = submitLabel ?? t('save');
  const resolvedCancelLabel = cancelLabel ?? t('cancel');

  return (
    <div
      className={cn(
        'px-4 py-4 border-t border-gray-200 flex-shrink-0 sm:px-6 sm:py-5',
        'bg-gray-50 flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3',
        className
      )}
    >
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className={cn(
          'min-h-11 px-5 py-2.5 text-sm font-medium',
          'text-gray-600 bg-white border border-gray-200 rounded-xl',
          'hover:bg-gray-50 transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {resolvedCancelLabel}
      </button>

      {showSubmit && canSubmit && (
        <button
          type={form ? 'submit' : 'button'}
          form={form}
          onClick={form ? undefined : onSubmit}
          disabled={isSubmitting || submitDisabled}
          className={cn(
            'flex min-h-11 items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium',
            'text-white bg-primary rounded-xl',
            'hover:bg-primary-dark transition-all shadow-sm',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? t('saving') : isEdit ? t('update') : resolvedSubmitLabel}
        </button>
      )}
    </div>
  );
}

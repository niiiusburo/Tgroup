/**
 * AppointmentFormShell — Modal wrapper for the unified appointment form.
 *
 * This is the component pages import and render.
 * It handles: modal open/close, backdrop, animations, footer buttons, success callback.
 *
 * Usage:
 *   <AppointmentFormShell
 *     mode="create"
 *     isOpen={open}
 *     onClose={() => setOpen(false)}
 *     onSuccess={refresh}
 *   />
 *
 *   <AppointmentFormShell
 *     mode="edit"
 *     isOpen={open}
 *     onClose={() => setOpen(false)}
 *     onSuccess={refresh}
 *     initialData={apiAppointmentToFormData(appointment)}
 *     customerReadOnly
 *   />
 */

import { useTranslation } from 'react-i18next';
import { X, Loader2 } from 'lucide-react';
import { AppointmentFormCore } from './AppointmentFormCore';
import { useAppointmentForm } from './useAppointmentForm';
import type { AppointmentFormShellProps } from './appointmentForm.types';

export function AppointmentFormShell({
  mode,
  isOpen,
  onClose,
  onSuccess,
  initialData,
  customerReadOnly,
}: AppointmentFormShellProps) {
  const { t } = useTranslation();
  const { data, errors, isSaving, submitError, handleChange, handleSubmit } =
    useAppointmentForm(mode, initialData, onSuccess);

  if (!isOpen) return null;

  const primaryLabel =
    mode === 'edit' ? t('appointments:saveChanges') : t('appointments:createAppointment');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">
          <AppointmentFormCore
            mode={mode}
            data={data}
            onChange={handleChange}
            customerReadOnly={customerReadOnly}
            errors={errors}
          />

          {submitError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {submitError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            {t('common:cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 rounded-xl shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

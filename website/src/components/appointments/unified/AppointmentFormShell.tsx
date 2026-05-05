/**
 * AppointmentFormShell — Modal wrapper for the unified appointment form.
 *
 * This is the component pages import and render.
 * It handles: modal open/close, backdrop, animations, footer buttons, success callback.
 *
 * USAGE:
 * <AppointmentFormShell
 *   mode="create"
 *   isOpen={open}
 *   onClose={() => setOpen(false)}
 *   onSuccess={refresh}
 * />
 *
 * <AppointmentFormShell
 *   mode="edit"
 *   isOpen={open}
 *   onClose={() => setOpen(false)}
 *   onSuccess={refresh}
 *   initialData={apiAppointmentToFormData(appointment)}
 *   customerReadOnly
 * />
 *
 * NOW USES FormShell module for unified modal structure.
 *
 * @crossref:used-in[Calendar, Appointments, Overview]
 */

import { useTranslation } from 'react-i18next';
import { CalendarPlus, Edit2 } from 'lucide-react';
import { AppointmentFormCore } from './AppointmentFormCore';
import { useAppointmentForm } from './useAppointmentForm';
import type { AppointmentFormShellProps } from './appointmentForm.types';
import type { Employee } from '@/data/mockEmployees';
import { FormShell, FormHeader, FormFooter } from '@/components/modules/FormShell';

export function AppointmentFormShell({
  mode,
  isOpen,
  onClose,
  onSuccess,
  initialData,
  customerReadOnly,
  employees,
}: AppointmentFormShellProps & { readonly employees?: readonly Employee[] }) {
  const { t } = useTranslation();
  const { data, errors, isSaving, submitError, handleChange, handleSubmit } =
    useAppointmentForm(mode, initialData, onSuccess);

  if (!isOpen) return null;

  const isEdit = mode === 'edit';

  return (
    <FormShell onClose={onClose} maxWidth="lg">
      <FormHeader
        title={isEdit ? t('appointments:editTitle') : t('appointments:createTitle')}
        subtitle={isEdit ? t('appointments:editSubtitle') : t('appointments:createSubtitle')}
        icon={isEdit ? <Edit2 className="w-5 h-5 text-white" /> : <CalendarPlus className="w-5 h-5 text-white" />}
        onClose={onClose}
        isEdit={isEdit}
      />

      <form id="appointment-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="appointment-ipad-form flex-1 overflow-y-auto px-4 py-5 custom-scrollbar sm:px-6 sm:py-6">
          <AppointmentFormCore
            mode={mode}
            data={data}
            onChange={handleChange}
            customerReadOnly={customerReadOnly}
            errors={errors}
            employees={employees}
          />

          {submitError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {submitError}
            </div>
          )}
        </div>

        <FormFooter
          onCancel={onClose}
          form="appointment-form"
          isSubmitting={isSaving}
          isEdit={isEdit}
          submitLabel={isEdit ? t('appointments:cpNht', 'Cập nhật') : t('appointments:createAppointment')}
        />
      </form>
    </FormShell>
  );
}

/**
 * Unified Appointment Form — Barrel Export
 *
 * Import everything appointment-form-related from this one path:
 *   import {
 *     AppointmentFormShell,
 *     AppointmentFormCore,
 *     useAppointmentForm,
 *     formDataToApiPayload,
 *     apiAppointmentToFormData,
 *     overviewAppointmentToFormData,
 *     calendarAppointmentToFormData,
 *   } from '@/components/appointments/unified';
 */

export { AppointmentFormShell } from './AppointmentFormShell';
export { AppointmentFormCore } from './AppointmentFormCore';
export { useAppointmentForm } from './useAppointmentForm';

export type {
  UnifiedAppointmentFormData,
  AppointmentFormMode,
  AppointmentFormShellProps,
  AppointmentFormCoreProps,
  UseAppointmentFormResult,
} from './appointmentForm.types';

export {
  formDataToApiPayload,
  apiAppointmentToFormData,
  overviewAppointmentToFormData,
  calendarAppointmentToFormData,
} from './appointmentForm.mapper';

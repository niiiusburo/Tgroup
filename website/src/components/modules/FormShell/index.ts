/**
 * FormShell Module — Unified modal form components for TG Clinic.
 *
 * Components:
 * - FormShell — Modal wrapper with backdrop and animations
 * - FormHeader — Orange gradient header with icon, title, subtitle
 * - FormFooter — Cancel + Save buttons
 * - FormField — Label + input compound component
 * - FormGrid — Column grid layouts
 * - ApiErrorPanel — API error display
 *
 * Usage:
 * import { FormShell, FormHeader, FormFooter, FormField, FormGrid, ApiErrorPanel } from '@/components/modules/FormShell';
 *
 * @crossref:used-in[AddCustomerForm, ServiceForm, AppointmentForm, EmployeeForm, PaymentForm]
 */

// Re-export all components from their individual files
export { FormShell } from './FormShell';
export { FormHeader } from './FormHeader';
export { FormFooter } from './FormFooter';
export { FormField } from './FormField';
export { FormGrid } from './FormGrid';
export { ApiErrorPanel } from './ApiErrorPanel';

// Re-export all types
export type { FormShellProps } from './FormShell';
export type { FormHeaderProps } from './FormHeader';
export type { FormFooterProps } from './FormFooter';
export type { FormFieldProps } from './FormField';
export type { FormGridProps } from './FormGrid';
export type { ApiErrorPanelProps, ApiErrorDetail } from './ApiErrorPanel';

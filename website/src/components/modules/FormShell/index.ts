/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[FormShell barrel: website/src/components/appointments/unified/AppointmentFormShell.tsx, website/src/components/forms/AddCustomerForm/AddCustomerForm.tsx, website/src/components/services/ServiceForm.tsx, website/src/components/shared/DeleteConfirmDialog.tsx]
 * @crossref:uses[website/src/components/modules/FormShell/{FormShell,FormHeader,FormFooter,FormField,FormGrid,ApiErrorPanel}.tsx, product-map/domains/settings-system.yaml]
 */
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

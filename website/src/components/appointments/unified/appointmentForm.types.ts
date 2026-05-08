/**
 * Unified Appointment Form Module
 * Single source of truth for creating and editing appointments across ALL pages.
 *
 * Used by: Overview, Calendar, Customers, Appointments pages
 * Replaces: AppointmentForm.tsx (create), EditAppointmentModal.tsx (edit), QuickAddAppointmentButton.tsx (trigger)
 *
 * Architecture:
 *   - AppointmentFormShell.tsx  → Modal wrapper + animation
 *   - AppointmentFormCore.tsx   → The actual form fields (shared between create/edit)
 *   - useAppointmentForm.ts     → Hook: validation, submit, API mapping
 *   - appointmentForm.types.ts  → Single canonical type definition
 *   - appointmentForm.mapper.ts → ApiAppointment <-> FormData bidirectional mapping
 */

// ═══════════════════════════════════════════════════════════════════════
// SINGLE CANONICAL TYPE — All pages use this one type
// ═══════════════════════════════════════════════════════════════════════

import type { AppointmentType } from '@/constants';
import type { Employee } from '@/data/mockEmployees';

/**
 * UnifiedAppointmentFormData — the ONE type for create AND edit.
 * No more AppointmentFormData vs CreateAppointmentInput vs OverviewAppointment chaos.
 */
export interface UnifiedAppointmentFormData {
  readonly id?: string;                    // Present in edit mode
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly customerCode?: string;
  readonly doctorId?: string | null;
  readonly doctorName?: string | null;
  readonly assistantId?: string | null;
  readonly assistantName?: string | null;
  readonly dentalAideId?: string | null;
  readonly dentalAideName?: string | null;
  readonly locationId: string;
  readonly locationName: string;
  readonly appointmentType: AppointmentType;
  readonly serviceName: string;
  readonly serviceId?: string;             // FK to products.id
  readonly date: string;                   // YYYY-MM-DD
  readonly startTime: string;              // HH:MM
  readonly notes: string;
  readonly estimatedDuration?: number;     // maps to dbo.appointments.timeexpected
  readonly color?: string;                 // '0'-'7', default '1'
  readonly status?: 'scheduled' | 'arrived' | 'cancelled'; // UI status (edit only)
  readonly customerType?: 'new' | 'returning';
}

/**
 * Mode discriminator for the form shell
 */
export type AppointmentFormMode = 'create' | 'edit';

/**
 * Props for the form shell (modal wrapper)
 */
export interface AppointmentFormShellProps {
  readonly mode: AppointmentFormMode;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSuccess?: () => void;
  readonly initialData?: Partial<UnifiedAppointmentFormData>;
  readonly customerReadOnly?: boolean;     // true for edit mode
}

/**
 * Props for the core form (fields only)
 */
export interface AppointmentFormCoreProps {
  readonly mode: AppointmentFormMode;
  readonly data: UnifiedAppointmentFormData;
  readonly onChange: (patch: Partial<UnifiedAppointmentFormData>) => void;
  readonly customerReadOnly?: boolean;
  readonly errors: Record<string, string>;
  /** Optional pre-fetched employees. If omitted, core fetches its own. */
  readonly employees?: readonly Employee[];
}

/**
 * Result from the useAppointmentForm hook
 */
export interface UseAppointmentFormResult {
  readonly data: UnifiedAppointmentFormData;
  readonly errors: Record<string, string>;
  readonly isSaving: boolean;
  readonly submitError: string | null;
  readonly handleChange: (patch: Partial<UnifiedAppointmentFormData>) => void;
  readonly handleSubmit: (e?: React.FormEvent) => Promise<void>;
  readonly isValid: boolean;
}

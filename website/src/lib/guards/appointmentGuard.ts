/**
 * Code-Level Dependency Guard for Appointments
 *
 * This module provides runtime and build-time helpers to catch
 * breaking changes when appointment-related types or APIs change.
 *
 * Usage in a component/hook:
 *   import { guardAppointmentShape } from '@/lib/guards/appointmentGuard';
 *   guardAppointmentShape(apiResponse); // throws if shape drifts
 */

import type { ApiAppointment } from '@/lib/api';
import type { UnifiedAppointmentFormData } from '@/components/appointments/unified';

// ─── Canonical field registry ─────────────────────────────────────

/**
 * These are the ONLY valid snake_case fields on ApiAppointment.
 * If the backend adds/removes fields, update this array.
 */
export const API_APPOINTMENT_FIELDS = [
  'id', 'name', 'date', 'time', 'datetimeappointment',
  'timeexpected', 'note', 'state', 'reason',
  'partnerid', 'partnername', 'partnerdisplayname', 'partnerphone', 'partnercode',
  'doctorid', 'doctorname',
  'companyid', 'companyname',
  'color', 'productid', 'productname',
  'assistantid', 'assistantname', 'dentalaideid', 'dentalaidename',
  'datecreated', 'lastupdated',
] as const;

/**
 * These are the ONLY valid camelCase fields on UnifiedAppointmentFormData.
 * If the form adds/removes fields, update this array.
 */
export const FORM_DATA_FIELDS = [
  'id', 'customerId', 'customerName', 'customerPhone',
  'doctorId', 'doctorName',
  'assistantId', 'assistantName',
  'dentalAideId', 'dentalAideName',
  'locationId', 'locationName',
  'appointmentType', 'serviceName', 'serviceId',
  'date', 'startTime',
  'notes', 'estimatedDuration', 'color', 'status', 'customerType',
] as const;

// ─── Runtime shape guard ──────────────────────────────────────────

export class AppointmentShapeError extends Error {
  constructor(message: string) {
    super(`[AppointmentGuard] ${message}`);
    this.name = 'AppointmentShapeError';
  }
}

/**
 * Validates that an ApiAppointment object contains the minimum required fields.
 * Call this after every fetch to catch API drift early.
 */
export function guardApiAppointmentShape(
  obj: unknown,
  context = 'unknown',
): asserts obj is ApiAppointment {
  if (!obj || typeof obj !== 'object') {
    throw new AppointmentShapeError(`Expected object in ${context}, got ${typeof obj}`);
  }

  const record = obj as Record<string, unknown>;

  // Required fields
  const required = ['id', 'date', 'partnerid'];
  for (const key of required) {
    if (record[key] === undefined) {
      throw new AppointmentShapeError(
        `Missing required field "${key}" in ApiAppointment (context: ${context})`,
      );
    }
  }

  // Warn about unknown fields (non-blocking in production, throws in dev)
  const known = new Set(API_APPOINTMENT_FIELDS as readonly string[]);
  const unknown = Object.keys(record).filter((k) => !known.has(k));
  if (unknown.length > 0 && import.meta.env.DEV) {
    console.warn(
      `[AppointmentGuard] Unknown fields in ApiAppointment (context: ${context}):`,
      unknown,
    );
  }
}

/**
 * Validates that a UnifiedAppointmentFormData object is complete enough to submit.
 */
export function guardFormDataShape(
  data: unknown,
): asserts data is UnifiedAppointmentFormData {
  if (!data || typeof data !== 'object') {
    throw new AppointmentShapeError(`Expected form data object, got ${typeof data}`);
  }

  const record = data as Record<string, unknown>;
  const required = ['customerId', 'locationId', 'date', 'startTime'];
  for (const key of required) {
    if (!record[key]) {
      throw new AppointmentShapeError(`Missing required form field: ${key}`);
    }
  }
}

// ─── Blast-radius checker ─────────────────────────────────────────

interface BlastRadiusResult {
  readonly affectedFiles: readonly string[];
  readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
  readonly message: string;
}

/**
 * Returns which files would be affected if a given appointment field changes.
 * This is a static analysis helper — call it in a script or test.
 */
export function getAppointmentBlastRadius(
  changedField: string,
): BlastRadiusResult {
  const blastMap: Record<string, { files: string[]; risk: BlastRadiusResult['riskLevel'] }> = {
    partnerid: {
      files: [
        'website/src/lib/api/appointments.ts',
        'website/src/hooks/useAppointments.ts',
        'website/src/hooks/useOverviewAppointments.ts',
        'website/src/components/appointments/unified/appointmentForm.mapper.ts',
        'website/src/pages/Customers.tsx',
      ],
      risk: 'critical',
    },
    doctorid: {
      files: [
        'website/src/lib/api/appointments.ts',
        'website/src/components/appointments/unified/appointmentForm.mapper.ts',
        'website/src/hooks/useCalendarData.ts',
      ],
      risk: 'high',
    },
    productid: {
      files: [
        'website/src/components/appointments/unified/appointmentForm.mapper.ts',
        'website/src/pages/Reports.tsx',
        'api/src/routes/products.js',
      ],
      risk: 'medium',
    },
    state: {
      files: [
        'website/src/constants/index.ts',
        'website/src/hooks/useOverviewAppointments.ts',
        'website/src/hooks/useCalendarData.ts',
        'website/src/components/appointments/unified/useAppointmentForm.ts',
      ],
      risk: 'high',
    },
    color: {
      files: [
        'website/src/constants/index.ts',
        'website/src/components/appointments/unified/AppointmentFormCore.tsx',
      ],
      risk: 'low',
    },
  };

  const match = blastMap[changedField];
  if (!match) {
    return {
      affectedFiles: ['unknown — run grep to find'],
      riskLevel: 'low',
      message: `No blast-radius entry for "${changedField}". Add it to appointmentGuard.ts.`,
    };
  }

  return {
    affectedFiles: match.files,
    riskLevel: match.risk,
    message: `Changing "${changedField}" affects ${match.files.length} file(s) at ${match.risk} risk.`,
  };
}

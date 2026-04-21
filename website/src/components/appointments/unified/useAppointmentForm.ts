/**
 * useAppointmentForm — Unified hook for create/edit appointment forms.
 *
 * Single source of truth for:
 *   - Form state management
 *   - Validation
 *   - API submission (create + update)
 *   - Error handling
 *
 * Used by AppointmentFormShell (which wraps AppointmentFormCore).
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type {
  UnifiedAppointmentFormData,
  UseAppointmentFormResult,
  AppointmentFormMode,
} from './appointmentForm.types';
import { formDataToApiPayload } from './appointmentForm.mapper';
import { createAppointment, updateAppointment } from '@/lib/api';
import { calculateEndTime } from '@/lib/calendarUtils';
import { getTodayInTimezone } from '@/lib/dateUtils';

const DEFAULT_DURATION = 30;
const DEFAULT_COLOR = '1';

function makeEmptyData(): UnifiedAppointmentFormData {
  return {
    customerId: '',
    customerName: '',
    customerPhone: '',
    doctorId: undefined,
    doctorName: undefined,
    assistantId: undefined,
    assistantName: undefined,
    dentalAideId: undefined,
    dentalAideName: undefined,
    locationId: '',
    locationName: '',
    appointmentType: 'consultation',
    serviceName: '',
    serviceId: undefined,
    date: getTodayInTimezone('Asia/Ho_Chi_Minh'),
    startTime: '09:00',
    endTime: calculateEndTime('09:00', DEFAULT_DURATION),
    notes: '',
    estimatedDuration: DEFAULT_DURATION,
    color: DEFAULT_COLOR,
    status: 'scheduled',
    customerType: 'returning',
  };
}

function mergeWithDefaults(
  partial?: Partial<UnifiedAppointmentFormData>,
): UnifiedAppointmentFormData {
  const empty = makeEmptyData();
  if (!partial) return empty;
  return {
    ...empty,
    ...partial,
    endTime:
      partial.endTime ??
      calculateEndTime(
        partial.startTime ?? empty.startTime,
        partial.estimatedDuration ?? empty.estimatedDuration,
      ),
  };
}

export function useAppointmentForm(
  mode: AppointmentFormMode,
  initialData?: Partial<UnifiedAppointmentFormData>,
  onSuccess?: () => void,
): UseAppointmentFormResult {
  const [data, setData] = useState<UnifiedAppointmentFormData>(() =>
    mergeWithDefaults(initialData),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset form state when initialData changes (e.g. editing a different appointment)
  const lastInitialDataRef = useRef(initialData);
  useEffect(() => {
    const hasChanged =
      JSON.stringify(initialData) !== JSON.stringify(lastInitialDataRef.current);
    if (hasChanged) {
      setData(mergeWithDefaults(initialData));
      setErrors({});
      setSubmitError(null);
      lastInitialDataRef.current = initialData;
    }
  }, [initialData]);

  const handleChange = useCallback((patch: Partial<UnifiedAppointmentFormData>) => {
    setData((prev) => {
      const next = { ...prev, ...patch };

      // Auto-calculate endTime when startTime or duration changes
      if (patch.startTime !== undefined || patch.estimatedDuration !== undefined) {
        const start = patch.startTime ?? next.startTime;
        const duration = patch.estimatedDuration ?? next.estimatedDuration ?? DEFAULT_DURATION;
        next.endTime = calculateEndTime(start, duration);
      }

      return next;
    });

    // Clear error for changed field
    if (patch) {
      const changedKey = Object.keys(patch)[0];
      if (changedKey) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[changedKey];
          return next;
        });
      }
    }
  }, []);

  const validate = useCallback((): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!data.customerId) nextErrors.customerId = 'Customer is required';
    if (!data.locationId) nextErrors.locationId = 'Location is required';
    if (!data.date) nextErrors.date = 'Date is required';
    if (!data.startTime) nextErrors.startTime = 'Start time is required';
    if (!data.endTime) nextErrors.endTime = 'End time is required';

    // Duration must be positive
    const duration = data.estimatedDuration ?? DEFAULT_DURATION;
    if (duration < 1 || duration > 480) {
      nextErrors.estimatedDuration = 'Duration must be between 1 and 480 minutes';
    }

    // Time logic: end must be after start
    if (data.startTime && data.endTime) {
      if (data.endTime <= data.startTime) {
        nextErrors.endTime = 'End time must be after start time';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [data]);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = formDataToApiPayload(data);

      if (mode === 'edit' && data.id) {
        await updateAppointment(data.id, payload);
      } else {
        await createAppointment(payload);
      }

      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save appointment';
      setSubmitError(message);
      console.error('Appointment form submit error:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [data, mode, validate, onSuccess]);

  return {
    data,
    errors,
    isSaving,
    submitError,
    handleChange,
    handleSubmit,
    isValid,
  };
}

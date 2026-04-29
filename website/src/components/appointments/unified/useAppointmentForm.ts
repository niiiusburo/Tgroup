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
import { DEFAULT_APPOINTMENT_DURATION } from '@/lib/appointmentDuration';
import { formatInTimezone, getTodayInTimezone } from '@/lib/dateUtils';

const DEFAULT_COLOR = '1';
const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';
const START_TIME_INTERVAL_MINUTES = 5;
const LAST_TIME_SLOT_MINUTES = (23 * 60) + 55;

export function getCurrentAppointmentStartTime(now = new Date()): string {
  const [hourPart, minutePart] = formatInTimezone(now, DEFAULT_TIMEZONE, 'HH:mm').split(':');
  const hour = Number(hourPart) % 24;
  const minute = Number(minutePart);
  const totalMinutes = (hour * 60) + minute;
  const roundedMinutes = Math.min(
    Math.ceil(totalMinutes / START_TIME_INTERVAL_MINUTES) * START_TIME_INTERVAL_MINUTES,
    LAST_TIME_SLOT_MINUTES,
  );
  const roundedHour = Math.floor(roundedMinutes / 60);
  const roundedMinute = roundedMinutes % 60;
  return `${String(roundedHour).padStart(2, '0')}:${String(roundedMinute).padStart(2, '0')}`;
}

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
    date: getTodayInTimezone(DEFAULT_TIMEZONE),
    startTime: getCurrentAppointmentStartTime(),
    notes: '',
    estimatedDuration: DEFAULT_APPOINTMENT_DURATION,
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
      return { ...prev, ...patch };
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

    const duration = data.estimatedDuration ?? DEFAULT_APPOINTMENT_DURATION;
    if (duration < 1 || duration > 480) {
      nextErrors.estimatedDuration = 'Duration must be between 1 and 480 minutes';
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

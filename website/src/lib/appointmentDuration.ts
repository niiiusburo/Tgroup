export const DEFAULT_APPOINTMENT_DURATION = 30;
export const APPOINTMENT_DURATION_OPTIONS = [10, 15, 20, 25, 30, 40, 45, 60, 90, 120] as const;

export function normalizeAppointmentDuration(
  durationMinutes: number | string | null | undefined,
  fallback = DEFAULT_APPOINTMENT_DURATION,
): number {
  const value = Number(durationMinutes);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.round(value);
}

export function formatAppointmentDuration(
  durationMinutes: number | string | null | undefined,
  unit = 'min',
): string {
  return `${normalizeAppointmentDuration(durationMinutes)} ${unit}`;
}

export function formatAppointmentStartDuration(
  startTime: string,
  durationMinutes: number | string | null | undefined,
  unit = 'min',
): string {
  return `${startTime} · ${formatAppointmentDuration(durationMinutes, unit)}`;
}

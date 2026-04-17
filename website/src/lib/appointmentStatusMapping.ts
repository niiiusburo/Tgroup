export type CalendarPhase =
  | 'scheduled'
  | 'waiting'
  | 'in-treatment'
  | 'done'
  | 'cancelled';

export const PHASE_TO_API_STATE: Record<CalendarPhase, string> = {
  scheduled: 'scheduled',
  waiting: 'arrived',
  'in-treatment': 'in Examination',
  done: 'done',
  cancelled: 'cancelled',
};

export function apiStateToPhase(state: string | null | undefined): CalendarPhase {
  const s = (state ?? '').toLowerCase().trim();
  if (s === 'arrived' || s === 'confirmed') return 'waiting';
  if (s === 'in examination' || s === 'in-progress') return 'in-treatment';
  if (s === 'done' || s === 'completed') return 'done';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  return 'scheduled';
}

export function calendarStatusToPhase(status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'): CalendarPhase {
  switch (status) {
    case 'confirmed':
      return 'waiting';
    case 'in-progress':
      return 'in-treatment';
    case 'completed':
      return 'done';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'scheduled';
  }
}

/** Translation keys for calendar phases (appointments namespace). Callers should do `t(PHASE_LABEL_KEYS[phase], { ns: 'appointments' })`. */
export const PHASE_LABEL_KEYS: Record<CalendarPhase, string> = {
  scheduled: 'appointments.phase.scheduled',
  waiting: 'appointments.phase.waiting',
  'in-treatment': 'appointments.phase.in-treatment',
  done: 'appointments.phase.done',
  cancelled: 'appointments.phase.cancelled',
};

/** Convenience helper: returns the translated label for a phase. */
export function getPhaseLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  phase: CalendarPhase
): string {
  return t(PHASE_LABEL_KEYS[phase], { ns: 'appointments' });
}

export const PHASE_STYLES: Record<CalendarPhase, { bg: string; text: string; border: string }> = {
  scheduled: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  waiting: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'in-treatment': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  done: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
};

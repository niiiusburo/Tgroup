import { describe, it, expect } from 'vitest';
import {
  apiStateToPhase,
  calendarStatusToPhase,
  PHASE_TO_API_STATE,
  PHASE_LABEL_KEYS,
} from '../appointmentStatusMapping';

describe('appointmentStatusMapping', () => {
  it('maps API states to phases tolerantly', () => {
    expect(apiStateToPhase('arrived')).toBe('waiting');
    expect(apiStateToPhase('confirmed')).toBe('scheduled');
    expect(apiStateToPhase('in Examination')).toBe('in-treatment');
    expect(apiStateToPhase('in-progress')).toBe('in-treatment');
    expect(apiStateToPhase('done')).toBe('done');
    expect(apiStateToPhase('completed')).toBe('done');
    expect(apiStateToPhase('cancelled')).toBe('cancelled');
    expect(apiStateToPhase('canceled')).toBe('cancelled');
    expect(apiStateToPhase('scheduled')).toBe('scheduled');
    expect(apiStateToPhase(null)).toBe('scheduled');
  });

  it('maps CalendarAppointment statuses to phases', () => {
    expect(calendarStatusToPhase('scheduled')).toBe('scheduled');
    expect(calendarStatusToPhase('confirmed')).toBe('scheduled');
    expect(calendarStatusToPhase('arrived')).toBe('waiting');
    expect(calendarStatusToPhase('in-progress')).toBe('in-treatment');
    expect(calendarStatusToPhase('completed')).toBe('done');
    expect(calendarStatusToPhase('cancelled')).toBe('cancelled');
  });

  it('has label keys for every phase', () => {
    Object.keys(PHASE_TO_API_STATE).forEach((phase) => {
      expect(PHASE_LABEL_KEYS[phase as keyof typeof PHASE_LABEL_KEYS]).toBeTruthy();
    });
  });
});

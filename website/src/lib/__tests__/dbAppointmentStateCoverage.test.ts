import { describe, it, expect } from 'vitest';
import { mapStateToStatus } from '../calendarUtils';
import { apiStateToPhase } from '../appointmentStatusMapping';

/**
 * Contract: every appointment state that actually exists in the database must be
 * mapped deliberately by BOTH mapping layers.
 *
 * Both layers fall back to 'scheduled' for anything unrecognised, which is the most
 * dangerous possible default: a cancelled appointment silently renders as an active
 * booking. That is exactly what happened with 'cancel' (7 rows on nk) — it was absent
 * from calendarUtils.mapStateToStatus and from apiStateToPhase, so both reported it
 * as scheduled.
 *
 * The state list below is the live `SELECT state, count(*) FROM dbo.appointments
 * GROUP BY state` from nk production (2026-07-26, 270,542 rows). If a new state
 * appears in the database, add it here and to both mappers — do not delete the case.
 */
const DB_STATES_ON_NK = [
  { state: 'completed', rows: 191883 },
  { state: 'done', rows: 30977 },
  { state: 'confirmed', rows: 20560 },
  { state: 'scheduled', rows: 14223 },
  { state: 'cancelled', rows: 9274 },
  { state: 'arrived', rows: 3585 },
  { state: 'in Examination', rows: 33 },
  { state: 'cancel', rows: 7 },
] as const;

// What each live DB state must mean, in both vocabularies.
const EXPECTED: Record<string, { status: string; phase: string }> = {
  completed: { status: 'completed', phase: 'done' },
  done: { status: 'completed', phase: 'done' },
  confirmed: { status: 'confirmed', phase: 'scheduled' },
  scheduled: { status: 'scheduled', phase: 'scheduled' },
  cancelled: { status: 'cancelled', phase: 'cancelled' },
  arrived: { status: 'arrived', phase: 'waiting' },
  'in Examination': { status: 'in-progress', phase: 'in-treatment' },
  cancel: { status: 'cancelled', phase: 'cancelled' },
};

describe('live nk appointment states are mapped by both layers', () => {
  it.each(DB_STATES_ON_NK)('$state ($rows rows) maps correctly', ({ state }) => {
    expect(mapStateToStatus(state)).toBe(EXPECTED[state].status);
    expect(apiStateToPhase(state)).toBe(EXPECTED[state].phase);
  });

  it('never reports a cancelled appointment as active', () => {
    for (const variant of ['cancel', 'cancelled', 'canceled', 'CANCEL', ' Cancel ']) {
      expect(mapStateToStatus(variant)).toBe('cancelled');
      expect(apiStateToPhase(variant)).toBe('cancelled');
    }
  });

  it('still defaults unknown states to scheduled (documented fallback)', () => {
    expect(mapStateToStatus('some-future-state')).toBe('scheduled');
    expect(apiStateToPhase('some-future-state')).toBe('scheduled');
  });

  it('handles null and empty state without throwing', () => {
    expect(mapStateToStatus(null)).toBe('scheduled');
    expect(apiStateToPhase(null)).toBe('scheduled');
    expect(mapStateToStatus('')).toBe('scheduled');
  });
});

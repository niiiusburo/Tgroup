import { describe, expect, it } from 'vitest';
import { inferRoleFromFlags } from './employee';

describe('inferRoleFromFlags', () => {
  it('classifies doctor assistants before the generic doctor role when both DB flags are set', () => {
    expect(inferRoleFromFlags(true, true, false, 'Trợ lý bác sĩ')).toBe('doctor-assistant');
  });

  it('matches unaccented doctor assistant titles', () => {
    expect(inferRoleFromFlags(true, true, false, 'Tro ly bac si')).toBe('doctor-assistant');
  });

  it('keeps plain doctors, assistants, and receptionists unchanged', () => {
    expect(inferRoleFromFlags(true, false, false, 'Bác sĩ')).toBe('doctor');
    expect(inferRoleFromFlags(false, true, false, 'Phụ tá')).toBe('assistant');
    expect(inferRoleFromFlags(false, false, true, 'Lễ tân')).toBe('receptionist');
  });
});

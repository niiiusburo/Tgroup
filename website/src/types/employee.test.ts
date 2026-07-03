import { describe, expect, it } from 'vitest';
import { inferRoleFromFlags } from './employee';

describe('inferRoleFromFlags', () => {
  it('classifies migrated dental aides as doctor-assistant before doctor', () => {
    expect(inferRoleFromFlags(true, true, false, 'Trợ lý bác sĩ')).toBe('doctor-assistant');
  });

  it('classifies unaccented dental aide titles as doctor-assistant', () => {
    expect(inferRoleFromFlags(true, true, false, 'Tro ly bac si')).toBe('doctor-assistant');
  });

  it('preserves normal doctor, assistant, and receptionist roles', () => {
    expect(inferRoleFromFlags(true, false, false, 'Bác sĩ')).toBe('doctor');
    expect(inferRoleFromFlags(false, true, false, 'Phụ tá')).toBe('assistant');
    expect(inferRoleFromFlags(false, false, true, 'Lễ tân')).toBe('receptionist');
  });
});

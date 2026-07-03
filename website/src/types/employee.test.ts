import { describe, expect, it } from 'vitest';
import { inferRoleFromFlags } from './employee';

describe('inferRoleFromFlags', () => {
  it('classifies dual doctor/assistant TLBS rows as doctor-assistant', () => {
    expect(inferRoleFromFlags(true, true, false, 'Trợ lý bác sĩ')).toBe('doctor-assistant');
    expect(inferRoleFromFlags(true, true, false, 'Tro ly bac si')).toBe('doctor-assistant');
  });

  it('keeps ordinary dual-flagged doctors in the doctor bucket', () => {
    expect(inferRoleFromFlags(true, true, false, 'Bác sĩ')).toBe('doctor');
  });

  it('keeps non-TLBS assistants in the assistant bucket', () => {
    expect(inferRoleFromFlags(false, true, false, 'Phụ tá')).toBe('assistant');
  });
});

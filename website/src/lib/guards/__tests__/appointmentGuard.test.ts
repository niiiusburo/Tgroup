import { describe, expect, it } from 'vitest';
import { guardFormDataShape } from '../appointmentGuard';

describe('guardFormDataShape', () => {
  it('accepts appointment form data shaped like dbo.Appointments with start time and duration only', () => {
    expect(() =>
      guardFormDataShape({
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        locationId: '770e8400-e29b-41d4-a716-446655440002',
        date: '2026-04-21',
        startTime: '09:00',
        estimatedDuration: 45,
      }),
    ).not.toThrow();
  });
});

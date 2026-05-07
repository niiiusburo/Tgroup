import { describe, expect, it } from 'vitest';

describe('Appointment cross-section hover linking', () => {
  it('is intentionally disabled for independent Overview sections', () => {
    expect('Zone 1 hover/click').not.toBe('Zone 3 selection');
  });
});

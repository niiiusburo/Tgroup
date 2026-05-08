import { describe, expect, it } from 'vitest';
import { syncQuantityWithSelectedTeeth } from './serviceFormToothQuantity';

describe('syncQuantityWithSelectedTeeth', () => {
  it('uses the selected tooth count when quantity is still the default', () => {
    expect(syncQuantityWithSelectedTeeth(['14', '15', '16', '17'], 1, [])).toBe(4);
  });

  it('updates quantity when it previously matched the selected tooth count', () => {
    expect(syncQuantityWithSelectedTeeth(['14', '15', '16'], 2, ['14', '15'])).toBe(3);
  });

  it('preserves a manually overridden quantity', () => {
    expect(syncQuantityWithSelectedTeeth(['14', '15', '16'], 6, ['14', '15'])).toBe(6);
  });
});

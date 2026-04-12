import { describe, it, expect } from 'vitest';
import { formatVND, formatVNDInput, parseVND } from './formatting';

describe('formatVND', () => {
  it('formats 0', () => expect(formatVND(0)).toBe('0 ₫'));
  it('formats 1000', () => expect(formatVND(1000)).toBe('1.000 ₫'));
  it('formats 1000000', () => expect(formatVND(1000000)).toBe('1.000.000 ₫'));
  it('formats 1234567890', () => expect(formatVND(1234567890)).toBe('1.234.567.890 ₫'));
  it('formats null safely', () => expect(formatVND(null)).toBe('0 ₫'));
  it('formats undefined safely', () => expect(formatVND(undefined)).toBe('0 ₫'));
  it('formats negative', () => expect(formatVND(-1000)).toBe('-1.000 ₫'));
});

describe('formatVNDInput', () => {
  it('null returns empty', () => expect(formatVNDInput(null)).toBe(''));
  it('0 returns "0"', () => expect(formatVNDInput(0)).toBe('0'));
  it('1000000 groups', () => expect(formatVNDInput(1000000)).toBe('1.000.000'));
});

describe('parseVND', () => {
  it('accepts dot-grouped', () => expect(parseVND('1.500.000')).toBe(1500000));
  it('accepts comma-grouped', () => expect(parseVND('1,500,000')).toBe(1500000));
  it('accepts space-grouped with VND', () => expect(parseVND('1 500 000 VND')).toBe(1500000));
  it('accepts trailing dong symbol', () => expect(parseVND('1500000₫')).toBe(1500000));
  it('rejects letters', () => expect(parseVND('abc')).toBeNull());
  it('rejects decimal 1.5', () => expect(parseVND('1.5')).toBeNull());
  it('rejects decimal 1,50', () => expect(parseVND('1,50')).toBeNull());
  it('rejects negative', () => expect(parseVND('-500')).toBeNull());
  it('rejects empty', () => expect(parseVND('')).toBeNull());
  it('accepts plain digits', () => expect(parseVND('500000')).toBe(500000));
});

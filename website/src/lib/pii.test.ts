import { describe, it, expect } from 'vitest';
import { maskPhone, maskEmail } from './pii';

describe('maskPhone', () => {
  it('shows only the last 4 digits', () => {
    expect(maskPhone('0986112031')).toBe('••••2031');
    expect(maskPhone('0972020908')).toBe('••••0908');
  });
  it('strips non-digits before masking', () => {
    expect(maskPhone('+84 (098) 611-2031')).toBe('••••2031');
  });
  it('handles empty / short / nullish input', () => {
    expect(maskPhone('')).toBe('');
    expect(maskPhone(null)).toBe('');
    expect(maskPhone(undefined)).toBe('');
    expect(maskPhone('123')).toBe('123'); // too short to mask
  });
});

describe('maskEmail', () => {
  it('keeps the first char + TLD, masks the rest', () => {
    expect(maskEmail('elisa@gmail.com')).toBe('e••••@••••.com');
    expect(maskEmail('phuongntn@clinic.vn')).toBe('p••••@••••.vn');
  });
  it('handles a phone-style local part', () => {
    expect(maskEmail('0362950725@gmail.com')).toBe('0••••@••••.com');
  });
  it('handles empty / nullish / non-email input', () => {
    expect(maskEmail('')).toBe('');
    expect(maskEmail(null)).toBe('');
    expect(maskEmail('notanemail')).toBe('n••••');
  });
});

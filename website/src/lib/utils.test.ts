import { describe, it, expect } from 'vitest';
import { normalizeText, cn } from './utils';

describe('normalizeText', () => {
  it('should handle null and undefined', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
  });

  it('should lowercase plain text', () => {
    expect(normalizeText('Pham Ngoc Huy')).toBe('pham ngoc huy');
  });

  it('should strip Vietnamese accents', () => {
    expect(normalizeText('PHẠM THỊ KIỀU OANH')).toBe('pham thi kieu oanh');
    expect(normalizeText('Nguyễn Thị Thanh')).toBe('nguyen thi thanh');
    expect(normalizeText('Đặng Thị Hồng Thúy')).toBe('dang thi hong thuy');
    expect(normalizeText('Vũ Hữu Đạt')).toBe('vu huu dat');
    expect(normalizeText('Phạm Thị Thảo Quyền')).toBe('pham thi thao quyen');
  });

  it('should strip mixed accents', () => {
    expect(normalizeText('café résumé naïve')).toBe('cafe resume naive');
  });

  it('should return empty string for empty input', () => {
    expect(normalizeText('')).toBe('');
  });
});

describe('cn', () => {
  it('should merge tailwind classes', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});

import { describe, it, expect } from 'vitest';
import { buildVietQrUrl, generatePaymentDescription } from './vietqr';

describe('buildVietQrUrl', () => {
  it('returns correct VietQR image URL with encoded parameters', () => {
    const url = buildVietQrUrl({
      bin: '970415',
      number: '8815251137',
      amount: 1000000,
      description: 'LATR1234',
      name: 'NGUYEN VAN A',
    });
    expect(url).toBe(
      'https://img.vietqr.io/image/970415-8815251137-compact.jpg?amount=1000000&addInfo=LATR1234&accountName=NGUYEN%20VAN%20A'
    );
  });
});

describe('generatePaymentDescription', () => {
  it("returns 'LT1234' for 'LAN TRAN' and '09xx1234'", () => {
    expect(generatePaymentDescription('LAN TRAN', '09xx1234')).toBe('LT1234');
  });

  it('returns empty string when customer name is empty', () => {
    expect(generatePaymentDescription('', '09xx1234')).toBe('');
  });

  it('returns empty string when customer name is whitespace only', () => {
    expect(generatePaymentDescription('   ', '09xx1234')).toBe('');
  });

  it("returns 'NVA123' for 'NGUYEN VAN A' and '123'", () => {
    expect(generatePaymentDescription('NGUYEN VAN A', '123')).toBe('NVA123');
  });
});

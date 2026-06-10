'use strict';

const { isPublicApiPath } = require('../publicApiPaths');

describe('isPublicApiPath', () => {
  test('allows health and login', () => {
    expect(isPublicApiPath('/api/health')).toBe(true);
    expect(isPublicApiPath('/api/Auth/login', 'POST')).toBe(true);
  });

  test('allows public CTV discount fan landing and claim flow', () => {
    expect(isPublicApiPath('/api/discount-codes/landing/CTV-ABC123')).toBe(true);
    expect(isPublicApiPath('/api/discount-codes/check-existing')).toBe(true);
    expect(isPublicApiPath('/api/discount-codes/generate', 'POST')).toBe(true);
  });

  test('blocks protected discount staff/CTV endpoints', () => {
    expect(isPublicApiPath('/api/discount-codes/mine')).toBe(false);
    expect(isPublicApiPath('/api/discount-codes/lookup')).toBe(false);
    expect(isPublicApiPath('/api/discount-codes/verify', 'POST')).toBe(false);
  });
});
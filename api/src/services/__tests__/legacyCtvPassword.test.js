'use strict';

const crypto = require('crypto');
const {
  canUseLegacyCtvPassword,
  verifyLegacyCtvPassword,
} = require('../legacyCtvPassword');

describe('legacy CTV password verification', () => {
  test('verifies salted SHA-256 hashes from the legacy CTV portal', () => {
    const salt = '0123456789abcdef0123456789abcdef';
    const hash = crypto.createHash('sha256').update(`${salt}secret123`).digest('hex');

    expect(verifyLegacyCtvPassword('secret123', `${salt}:${hash}`)).toBe(true);
    expect(verifyLegacyCtvPassword('wrong', `${salt}:${hash}`)).toBe(false);
  });

  test('supports older unsalted SHA-256 hashes only when exactly shaped', () => {
    const hash = crypto.createHash('sha256').update('secret123').digest('hex');

    expect(verifyLegacyCtvPassword('secret123', hash)).toBe(true);
    expect(verifyLegacyCtvPassword('secret123', 'not-a-sha')).toBe(false);
  });

  test('limits legacy password fallback to imported CTV rows', () => {
    expect(canUseLegacyCtvPassword({ is_ctv: true, created_via: 'legacy_ctv_import_20260528' })).toBe(true);
    expect(canUseLegacyCtvPassword({ is_ctv: true, created_via: 'admin_create' })).toBe(false);
    expect(canUseLegacyCtvPassword({ is_ctv: false, created_via: 'legacy_ctv_import_20260528' })).toBe(false);
  });
});

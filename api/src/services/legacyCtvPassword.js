'use strict';

const crypto = require('crypto');

const LEGACY_CTV_IMPORT_PREFIX = 'legacy_ctv_import';

function isHex(value, length) {
  return typeof value === 'string' && value.length === length && /^[0-9a-f]+$/i.test(value);
}

function safeHexEqual(left, right) {
  if (!isHex(left, right.length)) return false;
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function canUseLegacyCtvPassword(employee) {
  const createdVia = String(employee?.created_via || '');
  return employee?.is_ctv === true && createdVia.startsWith(LEGACY_CTV_IMPORT_PREFIX);
}

function verifyLegacyCtvPassword(password, storedHash) {
  if (!password || !storedHash) return false;

  try {
    if (storedHash.includes(':')) {
      const [salt, expectedHash] = storedHash.split(':', 2);
      if (!salt || !isHex(expectedHash, 64)) return false;
      const actualHash = crypto.createHash('sha256').update(`${salt}${password}`).digest('hex');
      return safeHexEqual(actualHash, expectedHash);
    }

    if (!isHex(storedHash, 64)) return false;
    const actualHash = crypto.createHash('sha256').update(password).digest('hex');
    return safeHexEqual(actualHash, storedHash);
  } catch (_err) {
    return false;
  }
}

module.exports = {
  LEGACY_CTV_IMPORT_PREFIX,
  canUseLegacyCtvPassword,
  verifyLegacyCtvPassword,
};

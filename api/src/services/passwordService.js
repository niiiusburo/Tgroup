/**
 * passwordService.js — Dual-format password compatibility
 * Supports bcrypt (salt:hash) and legacy plain SHA256 (no colon).
 * New hashes always use bcrypt. Legacy hashes are lazily rehashed on successful login.
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Verify a plaintext password against a stored hash.
 * @param {string} plain - Plaintext password from user
 * @param {string} stored - Stored hash from DB
 * @returns {Promise<boolean>} - Whether password matches
 */
async function verify(plain, stored) {
  if (!plain || !stored) return false;

  // bcrypt format: contains '$2a$', '$2b$', or '$2y$'
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    return bcrypt.compare(plain, stored);
  }

  // Legacy CTVlegacy format: salt:hash (salt is hex, hash is hex)
  if (stored.includes(':')) {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const computed = crypto.createHash('sha256').update(salt + plain).digest('hex');
    return computed === hash;
  }

  // Plain SHA256 (legacy CTVlegacy without salt)
  const computed = crypto.createHash('sha256').update(plain).digest('hex');
  return computed === stored;
}

/**
 * Check if a stored hash is in legacy format (needs rehashing).
 * @param {string} stored - Stored hash from DB
 * @returns {boolean} - True if legacy format
 */
function isLegacy(stored) {
  if (!stored) return false;
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    return false;
  }
  return true;
}

/**
 * Hash a plaintext password with bcrypt.
 * @param {string} plain - Plaintext password
 * @returns {Promise<string>} - bcrypt hash
 */
async function hash(plain) {
  return bcrypt.hash(plain, 10);
}

module.exports = { verify, hash, isLegacy };

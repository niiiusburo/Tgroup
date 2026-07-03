'use strict';
/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[investor auth password-reset routes]
 * @crossref:uses[dbo.investor_password_reset_tokens, crypto]
 */
const crypto = require('crypto');

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function generateResetToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateInitialPassword(length = 12) {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i += 1) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

module.exports = {
  TOKEN_TTL_MS,
  generateResetToken,
  hashResetToken,
  generateInitialPassword,
};
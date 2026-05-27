/**
 * phoneNormalize.js — Vietnam phone number normalization
 * Handles 8 common variants: +84xxx, 84xxx, 0xxx, +84-xxx, 0xx xxx xxxx, etc.
 * Returns the canonical form (0xxxxxxxx) for storage/lookup.
 */

/**
 * Normalize a Vietnam phone number to canonical form.
 * @param {string} input - Raw phone input
 * @returns {string} - Normalized phone (0xxxxxxxx) or empty string
 */
function normalizePhone(input) {
  if (!input) return '';
  let digits = String(input).replace(/\D/g, '');

  // Variant 1: +84XXXXXXXXX → 0XXXXXXXXX
  // Variant 2: 84XXXXXXXXX (no +) → 0XXXXXXXXX
  if (digits.startsWith('84') && digits.length >= 10) {
    digits = '0' + digits.slice(2);
  }

  // Variant 3: 9 digits without leading 0 → prepend 0
  if (digits.length === 9) {
    digits = '0' + digits;
  }

  // Validate: must be 10 digits starting with 0
  if (/^0\d{9}$/.test(digits)) {
    return digits;
  }

  return '';
}

/**
 * Generate all common variants of a phone number for fuzzy lookup.
 * @param {string} input - Raw phone input
 * @returns {string[]} - Array of normalized variants
 */
function getPhoneVariants(input) {
  const canonical = normalizePhone(input);
  if (!canonical) return [];

  const digits = canonical.slice(1); // Remove leading 0
  return [
    canonical,                 // 0xxxxxxxx
    '+84' + digits,            // +84xxxxxxxx
    '84' + digits,             // 84xxxxxxxx
    digits,                    // xxxxxxxxx (9 digits)
    canonical.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3'), // 0xxx xxx xxx
    canonical.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3'), // 0xx xxx xxxx
    '+84 ' + digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3'), // +84 xxx xxx xxx
    '84 ' + digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3'), // 84 xxx xxx xxx
  ].filter(Boolean);
}

module.exports = { normalizePhone, getPhoneVariants };

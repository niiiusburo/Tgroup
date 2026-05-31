/**
 * PII masking for display — hide most of a phone/email while keeping a small,
 * recognizable hint. Used in the CTV portal so collaborators can't read each
 * other's (or their own) full contact details.
 *
 *   maskPhone('0986112031')   -> '••••2031'   (only the last 4 digits)
 *   maskEmail('elisa@gmail.com') -> 'e••••@••••.com'
 *
 * NOTE: this masks at the display layer. It hides PII in the UI but the raw
 * value still travels in the API response — for true removal, mask server-side.
 */

const MASK = '••••';

export function maskPhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 4) return digits; // too short to meaningfully mask
  return MASK + digits.slice(-4);
}

export function maskEmail(email?: string | null): string {
  if (!email) return '';
  const value = String(email).trim();
  const at = value.indexOf('@');
  if (at < 1) {
    // not a normal email — show first char only
    return value.length <= 1 ? MASK : value.charAt(0) + MASK;
  }
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  const tld = dot >= 0 ? domain.slice(dot) : '';
  return `${local.charAt(0)}${MASK}@${MASK}${tld}`;
}

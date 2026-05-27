const crypto = require('crypto');

const REQUIRED_SHEETS = ['Hồ sơ', 'Phiếu cọc', 'Phiếu khám'];

function clean(value) {
  if (value === undefined || value === null) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if (value.text !== undefined) return clean(value.text);
    if (value.result !== undefined) return clean(value.result);
    if (value.richText) return value.richText.map((part) => part.text || '').join('').trim();
  }
  return String(value).replace(/\u0000/g, '').trim();
}

function normalizeText(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function textKey(value) {
  return normalizeText(value);
}

function noSign(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .trim();
}

function numberValue(value) {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value instanceof Date) return 0;
  const text = clean(value).replace(/,/g, '');
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function excelSerialToDate(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial)) return '';
  const date = new Date(Date.UTC(1899, 11, 30 + Math.floor(serial)));
  return date.toISOString().slice(0, 10);
}

function parseDate(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') return excelSerialToDate(value);
  const raw = clean(value);
  if (!raw) return '';
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 20000) return excelSerialToDate(numeric);
  const vn = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (vn) return `${vn[3]}-${vn[1].padStart(2, '0')}-${vn[2].padStart(2, '0')}`;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : '';
}

function normalizePhone(value) {
  if (value === undefined || value === null || value === '') return '';
  let raw = value;
  if (typeof raw === 'object' && !(raw instanceof Date)) raw = raw.result ?? raw.text ?? clean(raw);
  if (typeof raw === 'number') raw = Math.trunc(raw).toString();
  let digits = clean(raw).replace(/[^\d]/g, '');
  if (digits.startsWith('84') && digits.length >= 11) digits = `0${digits.slice(2)}`;
  if (digits.length === 9) digits = `0${digits}`;
  return digits;
}

function canonicalBranch(value) {
  const normalized = normalizeText(value);
  if (!normalized) return '';
  if (normalized.includes('HA NOI')) return 'Thẩm mỹ Hà Nội';
  if (normalized.includes('HO CHI MINH') || normalized.includes('HCM')) return 'Thẩm mỹ Hồ Chí Minh';
  return clean(value);
}

function mapPaymentMethod(value) {
  const normalized = normalizeText(value);
  if (!normalized) return 'cash';
  if (normalized.includes('CHUYEN KHOAN') || normalized.includes('CK') || normalized.includes('BANK')) return 'bank_transfer';
  if (normalized.includes('TIEN MAT') || normalized.includes('TM') || normalized.includes('CASH')) return 'cash';
  return 'cash';
}

function buildSourceRef(prefix, rowNumber, phone, date, amountOrName) {
  const hash = crypto
    .createHash('sha1')
    .update([prefix, rowNumber, phone, date, amountOrName].map((part) => clean(part)).join('|'))
    .digest('hex')
    .slice(0, 10);
  return `COSMETIC_SHEET:${prefix}:${rowNumber}:${hash}`;
}

module.exports = {
  REQUIRED_SHEETS,
  buildSourceRef,
  canonicalBranch,
  clean,
  mapPaymentMethod,
  normalizePhone,
  normalizeText,
  noSign,
  numberValue,
  parseDate,
  textKey,
};

const { query } = require('../../db');

const VALID_STATES = ['draft', 'scheduled', 'confirmed', 'arrived', 'in Examination', 'in-progress', 'done', 'cancelled'];

function errorResponse(res, status, errorCode, message) {
  return res.status(status).json({ errorCode, message });
}

function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isValidISODate(str) {
  if (!str || typeof str !== 'string') return false;
  const date = new Date(str);
  return !isNaN(date.getTime()) && str.match(/^\d{4}-\d{2}-\d{2}/);
}

const FK_TABLES = new Set(['partners', 'companies', 'employees']);

async function foreignKeyExists(table, id) {
  if (!FK_TABLES.has(table)) {
    throw new Error(`foreignKeyExists: "${table}" not allowlisted`);
  }
  const result = await query(`SELECT 1 FROM ${table} WHERE id = $1 LIMIT 1`, [id]);
  return result.length > 0;
}

function readBodyField(body, camelKey, lowerKey = camelKey.toLowerCase()) {
  if (Object.prototype.hasOwnProperty.call(body, camelKey)) return body[camelKey];
  return body[lowerKey];
}

module.exports = {
  errorResponse,
  foreignKeyExists,
  isValidISODate,
  isValidUUID,
  readBodyField,
  VALID_STATES,
};

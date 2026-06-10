'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[NK3 backend service function: api/src/services/ctvSelfProfile, api/src/routes/ctvProfile.js]
 * @crossref:uses[product-map/domains/ctv.yaml, docs/TEST-MATRIX.md, testbright.md]
 * @crossref:function[getCtvSelfProfile, updateCtvSelfProfile, changeCtvSelfPassword]
 * @crossref:uses[api/src/routes/ctvProfile.js, api/src/services/legacyCtvPassword.js, website/src/pages/CTV/tabs/CtvAccountSettings.tsx]
 */
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { canUseLegacyCtvPassword, verifyLegacyCtvPassword } = require('./legacyCtvPassword');

const LOBS = ['dental', 'cosmetic'];

class CtvProfileError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'CtvProfileError';
    this.status = status;
    this.code = code;
  }
}

function toProfile(row) {
  return {
    id: row.id,
    name: row.name || 'CTV',
    email: row.email || '',
    phone: row.phone || '',
    role: 'CTV',
    isLive: row.is_live === true,
  };
}

function normalizeName(name) {
  const value = String(name || '').trim().replace(/\s+/g, ' ');
  if (!value) {
    throw new CtvProfileError(400, 'P_NAME_REQUIRED', 'Name is required');
  }
  if (value.length > 120) {
    throw new CtvProfileError(400, 'P_NAME_TOO_LONG', 'Name must be 120 characters or fewer');
  }
  return value;
}

async function queryRows(lob, sql, params) {
  const db = getDb(lob);
  if (typeof db.queryRows === 'function') {
    return db.queryRows(sql, params);
  }
  const result = await db.query(sql, params);
  return result.rows;
}

async function findCtvProfileInLob(lob, employeeId) {
  const rows = await queryRows(
    lob,
    `SELECT id, name, email, phone, password_hash, created_via, is_ctv, is_live
       FROM dbo.partners
      WHERE id = $1
        AND employee = true
        AND COALESCE(is_ctv, false) = true
        AND COALESCE(isdeleted, false) = false
      LIMIT 1`,
    [employeeId]
  );
  return rows[0] || null;
}

async function getCtvSelfProfile(employeeId) {
  for (const lob of LOBS) {
    const row = await findCtvProfileInLob(lob, employeeId);
    if (row) return toProfile(row);
  }
  throw new CtvProfileError(404, 'P_CTV_NOT_FOUND', 'CTV profile not found');
}

async function updateCtvSelfProfile(employeeId, input) {
  const name = normalizeName(input?.name);
  const updatedRows = await Promise.all(
    LOBS.map((lob) =>
      queryRows(
        lob,
        `UPDATE dbo.partners
            SET name = $1,
                lastupdated = NOW()
          WHERE id = $2
            AND employee = true
            AND COALESCE(is_ctv, false) = true
            AND COALESCE(isdeleted, false) = false
          RETURNING id, name, email, phone`,
        [name, employeeId]
      )
    )
  );
  const row = updatedRows.flat()[0];
  if (!row) {
    throw new CtvProfileError(404, 'P_CTV_NOT_FOUND', 'CTV profile not found');
  }
  return toProfile(row);
}

function currentPasswordMatchesRow(currentPassword, row) {
  return bcrypt
    .compare(currentPassword, row.password_hash)
    .catch(() => false)
    .then((matches) => {
      if (matches) return true;
      if (canUseLegacyCtvPassword(row)) return verifyLegacyCtvPassword(currentPassword, row.password_hash);
      return false;
    });
}

async function changeCtvSelfPassword(employeeId, input) {
  const currentPassword = String(input?.currentPassword || '');
  const newPassword = String(input?.newPassword || '');

  if (!currentPassword || !newPassword) {
    throw new CtvProfileError(400, 'P_PASSWORD_REQUIRED', 'Current password and new password are required');
  }
  if (newPassword.length < 6) {
    throw new CtvProfileError(400, 'P_PASSWORD_TOO_SHORT', 'New password must be at least 6 characters');
  }

  // Locate the CTV in EVERY LOB it lives in. We then update the password in both
  // LOBs, so the current password must verify against every stored hash first —
  // otherwise a caller who only knows the password in one LOB could overwrite
  // (and hijack) the credential in another LOB whose hash has diverged.
  const rowsByLob = [];
  for (const lob of LOBS) {
    const row = await findCtvProfileInLob(lob, employeeId);
    if (row) rowsByLob.push({ lob, row });
  }
  if (rowsByLob.length === 0) {
    throw new CtvProfileError(404, 'P_CTV_NOT_FOUND', 'CTV profile not found');
  }

  const hashedRows = rowsByLob.filter(({ row }) => row.password_hash);
  if (hashedRows.length === 0) {
    throw new CtvProfileError(401, 'P_PASSWORD_NOT_SET', 'No password is set for this account');
  }

  for (const { row } of hashedRows) {
    const matches = await currentPasswordMatchesRow(currentPassword, row);
    if (!matches) {
      throw new CtvProfileError(401, 'P_CURRENT_PASSWORD_INVALID', 'Current password is incorrect');
    }
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updatedRows = await Promise.all(
    LOBS.map((lob) =>
      queryRows(
        lob,
        `UPDATE dbo.partners
            SET password_hash = $1,
                lastupdated = NOW()
          WHERE id = $2
            AND employee = true
            AND COALESCE(is_ctv, false) = true
            AND COALESCE(isdeleted, false) = false
          RETURNING id`,
        [passwordHash, employeeId]
      )
    )
  );

  if (updatedRows.flat().length === 0) {
    throw new CtvProfileError(404, 'P_CTV_NOT_FOUND', 'CTV profile not found');
  }

  return { success: true };
}

module.exports = {
  CtvProfileError,
  getCtvSelfProfile,
  updateCtvSelfProfile,
  changeCtvSelfPassword,
};

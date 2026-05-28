'use strict';

function toRows(result) {
  if (Array.isArray(result)) return result;
  if (result && result.rows) return result.rows;
  return [];
}

async function safeQueryRows(db, sql, params = []) {
  try {
    if (typeof db.queryRows === 'function') {
      return await db.queryRows(sql, params);
    }
    const result = await db.query(sql, params);
    return toRows(result);
  } catch (err) {
    console.error('[ctv] query error:', err.message);
    return [];
  }
}

function isCtvUser(user) {
  return user?.is_ctv === true || user?.isCtv === true;
}

async function isAdminCaller(employeeId, permission = 'ctv.manage') {
  try {
    const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');
    const permState = await resolveEffectivePermissions(employeeId);
    const list = (permState && permState.effectivePermissions) || [];
    return isAdminPermissionState(permState) || list.includes('*') || list.includes(permission);
  } catch (err) {
    return false;
  }
}

module.exports = { safeQueryRows, isCtvUser, isAdminCaller };

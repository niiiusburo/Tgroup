'use strict';

/**
 * ctvHelpers.js — shared helpers for CTV routes (including creation paths).
 *
 * @crossref:domain[ctv-creation]
 * Provides isCtvUser (used to gate POST /ctv create) and related permission helpers.
 * Note: safeQueryRows here is also exported but the live create handler in ctv.js
 * inlines its own copy (ctvActions.js — now unused/dead — imports the shared one).
 *
 * Absolute references:
 *   Used by create: /Users/thuanle/Documents/TamTMV/Tgrouptest/api/src/routes/ctv.js (POST /ctv create handler)
 *   Related: /Users/thuanle/Documents/TamTMV/Tgrouptest/api/src/routes/ctvPublic.js (public join, has own safe impl)
 *   SSOT: /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/components/shared/CtvCreationForm/
 *   Call sites (frontend): /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/components/commission/CtvManagementTab.tsx , /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/components/ctv/CtvRecruitModal.tsx , /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/pages/CTV/JoinCtv.tsx
 *   AGENTS.md: /Users/thuanle/Documents/TamTMV/Tgrouptest/AGENTS.md §5.1
 *   Product: /Users/thuanle/Documents/TamTMV/Tgrouptest/product-map/domains/ctv.yaml (creation subsection)
 *   API types: /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/lib/api/ctv.ts
 *
 * Invariants surface here via callers: dental-forced LOB, email-optional (enforced in route handlers), cross-DB, etc.
 * @crossref:uses[../services/permissionService for isAdminCaller]
 * @crossref:used-in[ctv.js create + profile + client journeys routes]
 */
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

async function isAdminCaller(employeeId, permission = 'ctv.manage', authLob = 'dental') {
  try {
    const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');
    const permState = await resolveEffectivePermissions(employeeId, authLob);
    const list = (permState && permState.effectivePermissions) || [];
    return isAdminPermissionState(permState) || list.includes('*') || list.includes(permission);
  } catch (err) {
    return false;
  }
}

module.exports = { safeQueryRows, isCtvUser, isAdminCaller };

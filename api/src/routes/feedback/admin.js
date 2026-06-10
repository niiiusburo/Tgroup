'use strict';

/**
 * @crossref:domain[feedback-cms]
 * @crossref:used-in[permission helpers for api/src/routes/feedback/adminRoutes.js and api/src/routes/feedback/userRoutes.js (isAdmin badge logic)]
 * @crossref:uses[api/src/services/permissionService.js (resolveEffectivePermissions, isAdminPermissionState), product-map/domains/feedback-cms.yaml]
 */
const {
  resolveEffectivePermissions,
  isAdminPermissionState,
} = require('../../services/permissionService');

const FEEDBACK_VIEW_PERMS = ['feedback.view', 'permissions.view'];
const FEEDBACK_REPLY_PERMS = ['feedback.reply', 'permissions.edit'];
const FEEDBACK_EDIT_PERMS = ['feedback.edit', 'permissions.edit'];
const FEEDBACK_DELETE_PERMS = ['feedback.delete', 'permissions.edit'];

function hasAnyPermission(effectivePermissions, candidates) {
  if (effectivePermissions.includes('*')) return true;
  return candidates.some((perm) => effectivePermissions.includes(perm));
}

async function resolveFeedbackPermissionState(employeeId, authLob) {
  return resolveEffectivePermissions(employeeId, authLob || 'dental');
}

async function canViewFeedbackAdmin(employeeId, authLob) {
  const state = await resolveFeedbackPermissionState(employeeId, authLob);
  if (isAdminPermissionState(state)) return true;
  return hasAnyPermission(state.effectivePermissions, FEEDBACK_VIEW_PERMS);
}

async function canMutateFeedback(employeeId, authLob, action) {
  const state = await resolveFeedbackPermissionState(employeeId, authLob);
  if (isAdminPermissionState(state)) return true;

  const candidatesByAction = {
    reply: FEEDBACK_REPLY_PERMS,
    edit: FEEDBACK_EDIT_PERMS,
    delete: FEEDBACK_DELETE_PERMS,
  };
  const candidates = candidatesByAction[action] || FEEDBACK_EDIT_PERMS;
  return hasAnyPermission(state.effectivePermissions, candidates);
}

/**
 * Legacy helper used by unread-count to decide admin vs staff badge logic.
 */
async function isAdmin(employeeId, authLob = 'dental') {
  return canViewFeedbackAdmin(employeeId, authLob);
}

function requireFeedbackPermission(action) {
  return (req, res, next) => {
    const employeeId = req.user?.employeeId;
    const authLob = req.user?.authLob || 'dental';

    const check = action === 'view'
      ? canViewFeedbackAdmin(employeeId, authLob)
      : canMutateFeedback(employeeId, authLob, action);

    check
      .then((allowed) => {
        if (allowed) return next();
        const label = action === 'view' ? 'feedback.view' : `feedback.${action}`;
        return res.status(403).json({ error: `Permission denied: ${label}` });
      })
      .catch((err) => {
        console.error('requireFeedbackPermission error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      });
  };
}

/** @deprecated Use requireFeedbackPermission('view') — kept for test mocks. */
function requireAdmin(req, res, next) {
  return requireFeedbackPermission('view')(req, res, next);
}

module.exports = {
  isAdmin,
  requireAdmin,
  requireFeedbackPermission,
  canViewFeedbackAdmin,
  canMutateFeedback,
};
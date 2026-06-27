'use strict';

/**
 * Admin-only investor customer allowlist controls.
 * @crossref:domain[auth, customers-partners]
 * @crossref:used-in[Customers admin investor checkbox]
 * @crossref:uses[dbo.investor_accounts, dbo.investor_clients, resolveEffectivePermissions]
 */

const { query } = require('../../db');
const { resolveEffectivePermissions } = require('../../services/permissionService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function isAdminPermissions(permissions) {
  const groupId = String(permissions?.groupId || '').trim().toLowerCase();
  const groupName = String(permissions?.groupName || '').trim().toLowerCase();
  const effectivePermissions = permissions?.effectivePermissions || [];
  return (
    groupId === '11111111-0000-0000-0000-000000000001' ||
    groupName === 'admin' ||
    groupName === 'super admin' ||
    groupName === 'system administrator' ||
    effectivePermissions.includes('*')
  );
}

async function assertAdmin(req, res) {
  const employeeId = req.user?.employeeId;
  if (!employeeId) {
    sendError(res, 401, 'UNAUTHENTICATED', 'Authentication required');
    return null;
  }

  const permissions = await resolveEffectivePermissions(employeeId);
  if (!isAdminPermissions(permissions)) {
    sendError(res, 403, 'ADMIN_REQUIRED', 'Admin access required');
    return null;
  }

  return permissions;
}

async function getConfiguredInvestorId(runQuery = query) {
  const rows = await runQuery(
    `SELECT ia.partner_id AS "investorId"
     FROM dbo.investor_accounts ia
     JOIN dbo.partners p ON p.id = ia.partner_id
     JOIN dbo.permission_groups pg ON pg.id = p.tier_id
     WHERE ia.active = true
       AND p.employee = true
       AND p.isdeleted = false
       AND pg.name = 'investor'
     ORDER BY ia.lastupdated DESC NULLS LAST, ia.datecreated DESC NULLS LAST`
  );

  if (!rows || rows.length === 0) {
    const err = new Error('One active investor account is required');
    err.status = 404;
    err.code = 'INVESTOR_ACCOUNT_NOT_CONFIGURED';
    throw err;
  }

  if (rows.length > 1) {
    const err = new Error('Multiple active investor accounts require an investor selector');
    err.status = 409;
    err.code = 'MULTIPLE_INVESTOR_ACCOUNTS';
    throw err;
  }

  return rows[0].investorId;
}

function sendConfiguredInvestorError(res, err) {
  if (err?.status === 404 || err?.status === 409) {
    return sendError(res, err.status, err.code, err.message);
  }
  return null;
}

async function listInvestorVisibility(req, res) {
  try {
    const admin = await assertAdmin(req, res);
    if (!admin) return null;

    const investorId = await getConfiguredInvestorId();
    const rows = await query(
      `SELECT partner_id
       FROM dbo.investor_clients
       WHERE investor_id = $1 AND is_visible = true
       ORDER BY lastupdated DESC NULLS LAST, datecreated DESC NULLS LAST`,
      [investorId]
    );

    return res.json({
      investorId,
      customerIds: rows.map((row) => row.partner_id),
    });
  } catch (err) {
    if (sendConfiguredInvestorError(res, err)) return null;
    console.error('listInvestorVisibility error:', err);
    return sendError(res, 500, 'INVESTOR_VISIBILITY_FAILED', 'Failed to load investor visibility');
  }
}

async function setInvestorVisibility(req, res) {
  try {
    const { id } = req.params;
    const { visible } = req.body || {};

    if (!UUID_RE.test(id)) {
      return sendError(res, 400, 'VALIDATION', 'Customer id must be a UUID');
    }

    if (typeof visible !== 'boolean') {
      return sendError(res, 400, 'VALIDATION', 'visible must be a boolean');
    }

    const admin = await assertAdmin(req, res);
    if (!admin) return null;

    const investorId = await getConfiguredInvestorId();
    const customerRows = await query(
      `SELECT id FROM dbo.partners
       WHERE id = $1 AND customer = true AND isdeleted = false`,
      [id]
    );

    if (!customerRows || customerRows.length === 0) {
      return sendError(res, 404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
    }

    if (visible) {
      await query(
        `INSERT INTO dbo.investor_clients (investor_id, partner_id, is_visible, datecreated, lastupdated)
         VALUES ($1, $2, true, NOW(), NOW())
         ON CONFLICT (investor_id, partner_id) DO UPDATE
           SET is_visible = true,
               lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')`,
        [investorId, id]
      );
    } else {
      await query(
        `UPDATE dbo.investor_clients
         SET is_visible = false,
             lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
         WHERE investor_id = $1 AND partner_id = $2`,
        [investorId, id]
      );
    }

    return res.json({ investorId, customerId: id, visible });
  } catch (err) {
    if (sendConfiguredInvestorError(res, err)) return null;
    console.error('setInvestorVisibility error:', err);
    return sendError(res, 500, 'INVESTOR_VISIBILITY_FAILED', 'Failed to update investor visibility');
  }
}

module.exports = {
  getConfiguredInvestorId,
  isAdminPermissions,
  listInvestorVisibility,
  setInvestorVisibility,
};

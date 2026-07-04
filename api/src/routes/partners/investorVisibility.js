'use strict';

/**
 * Admin-only investor customer allowlist controls.
 * @crossref:domain[auth, customers-partners]
 * @crossref:used-in[Customers admin investor checkbox]
 * @crossref:uses[dbo.investor_accounts, dbo.investor_clients, resolveEffectivePermissions]
 */

const { query } = require('../../db');
const { resolveEffectivePermissions } = require('../../services/permissionService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

async function investorClientsUseAccountId(runQuery = query) {
  const rows = await runQuery(
    `SELECT 1
     FROM pg_constraint c
     JOIN pg_class child ON child.oid = c.conrelid
     JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
     JOIN pg_class parent ON parent.oid = c.confrelid
     JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
     WHERE c.contype = 'f'
       AND child_ns.nspname = 'dbo'
       AND child.relname = 'investor_clients'
       AND parent_ns.nspname = 'dbo'
       AND parent.relname = 'investor_accounts'
     LIMIT 1`
  );
  return rows.length > 0;
}

async function getConfiguredInvestor(runQuery = query) {
  const usesAccountId = await investorClientsUseAccountId(runQuery);
  const rows = await runQuery(
    `SELECT ia.id AS "investorAccountId",
            ia.partner_id AS "investorId"
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

  return {
    investorAccountId: rows[0].investorAccountId,
    investorId: rows[0].investorId,
    scopeInvestorId: usesAccountId ? rows[0].investorAccountId : rows[0].investorId,
  };
}

async function getConfiguredInvestorId(runQuery = query) {
  const investor = await getConfiguredInvestor(runQuery);
  return investor.investorId;
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

    const investor = await getConfiguredInvestor();
    const rows = await query(
      `SELECT partner_id
       FROM dbo.investor_clients
       WHERE investor_id = $1 AND lob = 'dental' AND is_visible = true
       ORDER BY marked_at DESC NULLS LAST, lastupdated DESC NULLS LAST, datecreated DESC NULLS LAST`,
      [investor.scopeInvestorId]
    );

    return res.json({
      investorId: investor.investorId,
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

    const investor = await getConfiguredInvestor();
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
        `INSERT INTO dbo.investor_clients (
           investor_id, partner_id, lob, is_visible, marked_by_partner_id, marked_at, datecreated, lastupdated
         )
         VALUES ($1, $2, 'dental', true, $3, NOW(), NOW(), NOW())
         ON CONFLICT (investor_id, partner_id, lob) DO UPDATE
           SET is_visible = true,
               marked_by_partner_id = EXCLUDED.marked_by_partner_id,
               marked_at = EXCLUDED.marked_at,
               lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')`,
        [investor.scopeInvestorId, id, req.user.employeeId]
      );
    } else {
      await query(
        `UPDATE dbo.investor_clients
         SET is_visible = false,
             marked_by_partner_id = $3,
             marked_at = NOW(),
             lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
         WHERE investor_id = $1 AND partner_id = $2 AND lob = 'dental'`,
        [investor.scopeInvestorId, id, req.user.employeeId]
      );
    }

    return res.json({ investorId: investor.investorId, customerId: id, visible });
  } catch (err) {
    if (sendConfiguredInvestorError(res, err)) return null;
    console.error('setInvestorVisibility error:', err);
    return sendError(res, 500, 'INVESTOR_VISIBILITY_FAILED', 'Failed to update investor visibility');
  }
}

module.exports = {
  getConfiguredInvestor,
  getConfiguredInvestorId,
  isAdminPermissions,
  investorClientsUseAccountId,
  listInvestorVisibility,
  setInvestorVisibility,
};

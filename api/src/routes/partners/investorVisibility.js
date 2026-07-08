'use strict';

/**
 * Admin-only investor customer allowlist controls.
 * @crossref:domain[auth, customers-partners]
 * @crossref:used-in[Customers admin investor checkbox]
 * @crossref:uses[dbo.investor_accounts, dbo.investor_clients, resolveEffectivePermissions]
 */

const { query } = require('../../db');
const { resolveEffectivePermissions } = require('../../services/permissionService');

// Standard 8-4-4-4-12 UUID. The previous pattern was missing the 4th group
// (8-4-4-12), so it rejected EVERY real customer UUID — every investor-visibility
// toggle returned 400 "Customer id must be a UUID", i.e. admins could not add
// clients. Matches the canonical uuidRegex in services/permissionService.js.
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

  // Single global investor model: the admin manages ONE canonical investor's
  // client allowlist. `investor_clients.investor_id` references investor_accounts.id
  // when the FK is present, otherwise it stores the investor's partner id — count
  // visible clients against whichever key THIS database uses so the "in-use"
  // ranking is correct. (usesAccountId is a boolean-derived internal literal, not
  // user input, so interpolating the join column is injection-safe.)
  const scopeKeyExpr = usesAccountId ? 'ia.id' : 'ia.partner_id';
  const rows = await runQuery(
    `SELECT ia.id AS "investorAccountId",
            ia.partner_id AS "investorId",
            COALESCE(vc.cnt, 0) AS "visibleClientCount"
     FROM dbo.investor_accounts ia
     JOIN dbo.partners p ON p.id = ia.partner_id
     JOIN dbo.permission_groups pg ON pg.id = p.tier_id
     LEFT JOIN (
       SELECT investor_id, COUNT(*) AS cnt
       FROM dbo.investor_clients
       WHERE lob = 'dental' AND is_visible = true
       GROUP BY investor_id
     ) vc ON vc.investor_id = ${scopeKeyExpr}
     WHERE ia.active = true
       AND p.employee = true
       AND p.isdeleted = false
       AND lower(pg.name) = 'investor'
     ORDER BY COALESCE(vc.cnt, 0) DESC, ia.datecreated ASC NULLS LAST, ia.id ASC`
  );

  if (!rows || rows.length === 0) {
    const err = new Error('One active investor account is required');
    err.status = 404;
    err.code = 'INVESTOR_ACCOUNT_NOT_CONFIGURED';
    throw err;
  }

  // Resolve deterministically to the canonical investor — the account already
  // serving the most visible clients (tie-break: oldest, then id). We must NEVER
  // 409 on multiple active accounts: a stray or leftover E2E investor account
  // must not block the admin's client-selection flow. This is the single-investor
  // model's "fix once and for all" — the resolver always lands on the real,
  // in-use investor even when duplicates exist.
  const selected = rows[0];

  // Mirror resolveInvestorScope (investor READ) exactly: an investor_clients row
  // belongs to this investor if investor_id equals the investor's partner_id OR
  // any of its active investor_accounts ids. Historically rows were written under
  // both keys, so admin management (list + untick) must match the SAME union the
  // investor sees — otherwise the admin's checkbox list under-reports what the
  // investor can see and an untick silently misses legacy-keyed rows, leaving a
  // "removed" client permanently visible. scopeMatchIds is that union set.
  const accountRows = await runQuery(
    `SELECT id FROM dbo.investor_accounts WHERE partner_id = $1 AND active = true`,
    [selected.investorId]
  );
  const scopeMatchIds = Array.from(
    new Set([selected.investorId, ...accountRows.map((row) => row.id)])
  );

  // New rows are written under ONE canonical key: the account id when the FK is
  // present, else the partner id. The union read/untick above still find them.
  const writeKey = usesAccountId ? selected.investorAccountId : selected.investorId;

  return {
    investorAccountId: selected.investorAccountId,
    investorId: selected.investorId,
    scopeInvestorId: writeKey,
    writeKey,
    scopeMatchIds,
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
    // Union match (partner_id OR any active account id) so the admin checkbox
    // list shows EXACTLY what the investor sees via resolveInvestorScope. GROUP BY
    // collapses a customer that has rows under more than one key into one entry.
    const rows = await query(
      `SELECT partner_id
       FROM dbo.investor_clients
       WHERE investor_id = ANY($1::uuid[]) AND lob = 'dental' AND is_visible = true
       GROUP BY partner_id
       ORDER BY MAX(marked_at) DESC NULLS LAST, MAX(lastupdated) DESC NULLS LAST, MAX(datecreated) DESC NULLS LAST`,
      [investor.scopeMatchIds]
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
      // Untick must clear the customer under EVERY key the investor read matches
      // (partner_id OR any active account id), not just the canonical write key —
      // otherwise a legacy-keyed row survives and the "removed" client stays
      // visible to the investor. Match the same scopeMatchIds union as the read.
      await query(
        `UPDATE dbo.investor_clients
         SET is_visible = false,
             marked_by_partner_id = $2,
             marked_at = NOW(),
             lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
         WHERE investor_id = ANY($1::uuid[]) AND partner_id = $3 AND lob = 'dental'`,
        [investor.scopeMatchIds, req.user.employeeId, id]
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

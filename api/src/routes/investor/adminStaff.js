'use strict';
/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[/api/admin/investors mounted in server.js]
 * @crossref:uses[dbo.investor_accounts, dbo.investor_clients, dbo.investor_view_audit, bcryptjs]
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const {
  InvestorAdminCreateSchema,
  InvestorAdminUpdateSchema,
} = require('@tgroup/contracts');
const { requirePermission } = require('../../middleware/auth');
const { getQuery } = require('../../db');
const { generateInitialPassword } = require('./services/passwordReset');
const {
  appendCompanyScopeToSql,
  resolveLocationScope,
  sendLocationScopeError,
} = require('../../services/locationScope');

const router = express.Router();

function resolveLob(req, queryLob) {
  if (queryLob === 'dental' || queryLob === 'cosmetic') return queryLob;
  return req.lob || 'dental';
}

/**
 * GET /api/admin/investors?lob=
 */
router.get('/', requirePermission('investors.manage'), async (req, res) => {
  try {
    const lob = resolveLob(req, req.query.lob);
    const db = getQuery(lob);
    const locationScope = await resolveLocationScope(req);
    if (sendLocationScopeError(res, locationScope)) return;

    const countScopeSql = locationScope.companyIds === null
      ? ''
      : ' AND client_partner.companyid = ANY($2::uuid[])';
    const params = locationScope.companyIds === null ? [lob] : [lob, locationScope.companyIds];

    const rows = await db(
      `SELECT ia.id, ia.email, ia.investor_name, ia.lob, ia.is_active,
              ia.last_login, ia.created_at,
              COUNT(ic.id) FILTER (WHERE ic.is_visible = true${countScopeSql}) AS client_count
       FROM dbo.investor_accounts ia
       LEFT JOIN dbo.investor_clients ic ON ic.investor_id = ia.id AND ic.lob = ia.lob
       LEFT JOIN dbo.partners client_partner ON client_partner.id = ic.partner_id
       WHERE ia.lob = $1
       GROUP BY ia.id
       ORDER BY ia.created_at DESC`,
      params
    );

    const items = (rows || []).map((r) => ({
      id: r.id,
      email: r.email,
      investor_name: r.investor_name,
      lob: r.lob,
      is_active: r.is_active,
      last_login: r.last_login,
      created_at: r.created_at,
      client_count: parseInt(r.client_count, 10) || 0,
    }));

    return res.json({ success: true, items, lob });
  } catch (err) {
    console.error('[investorAdmin] list error:', err);
    return res.status(500).json({ error: 'Server error', code: 'E_FETCH_FAILED' });
  }
});

/**
 * POST /api/admin/investors
 */
router.post('/', requirePermission('investors.manage'), async (req, res) => {
  try {
    const parsed = InvestorAdminCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', code: 'VALIDATION' });
    }

    const { email, investorName, lob, password: suppliedPassword } = parsed.data;
    const db = getQuery(lob);
    const createdBy = req.user.employeeId || null;

    const existing = await db(
      `SELECT id FROM dbo.investor_accounts WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email.trim()]
    );
    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered', code: 'U_DUPLICATE_EMAIL' });
    }

    const initialPassword = suppliedPassword || generateInitialPassword(12);
    const passwordHash = await bcrypt.hash(initialPassword, 10);

    const inserted = await db(
      `INSERT INTO dbo.investor_accounts
         (email, password_hash, investor_name, lob, is_active, created_by_partner_id, created_at)
       VALUES ($1, $2, $3, $4, true, $5, NOW())
       RETURNING id, email, investor_name, lob, is_active, created_at`,
      [email.trim(), passwordHash, investorName.trim(), lob, createdBy]
    );

    const investor = inserted[0];
    const response = {
      success: true,
      investor: {
        id: investor.id,
        email: investor.email,
        investor_name: investor.investor_name,
        lob: investor.lob,
        is_active: investor.is_active,
        created_at: investor.created_at,
      },
    };

    if (!suppliedPassword) {
      response.initialPassword = initialPassword;
    }

    return res.status(201).json(response);
  } catch (err) {
    console.error('[investorAdmin] create error:', err);
    return res.status(500).json({ error: 'Server error', code: 'E_CREATE_FAILED' });
  }
});

/**
 * PATCH /api/admin/investors/:id
 */
router.patch('/:id', requirePermission('investors.manage'), async (req, res) => {
  try {
    const parsed = InvestorAdminUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', code: 'VALIDATION' });
    }

    const { investorName, isActive } = parsed.data;
    const lob = resolveLob(req, req.query.lob);
    const db = getQuery(lob);

    const existing = await db(
      `SELECT id, email, investor_name, lob, is_active
       FROM dbo.investor_accounts WHERE id = $1 AND lob = $2 LIMIT 1`,
      [req.params.id, lob]
    );
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Investor not found', code: 'U_INVESTOR_NOT_FOUND' });
    }

    const sets = [];
    const params = [];
    let idx = 1;

    if (investorName !== undefined) {
      sets.push(`investor_name = $${idx++}`);
      params.push(investorName.trim());
    }
    if (isActive !== undefined) {
      sets.push(`is_active = $${idx++}`);
      params.push(isActive);
    }
    sets.push(`updated_at = NOW()`);
    params.push(req.params.id, lob);

    const updated = await db(
      `UPDATE dbo.investor_accounts SET ${sets.join(', ')}
       WHERE id = $${idx++} AND lob = $${idx}
       RETURNING id, email, investor_name, lob, is_active, last_login, created_at`,
      params
    );

    return res.json({ success: true, investor: updated[0] });
  } catch (err) {
    console.error('[investorAdmin] patch error:', err);
    return res.status(500).json({ error: 'Server error', code: 'E_UPDATE_FAILED' });
  }
});

/**
 * GET /api/admin/investors/:id/clients
 */
router.get('/:id/clients', requirePermission('investors.manage'), async (req, res) => {
  try {
    const lob = resolveLob(req, req.query.lob);
    const db = getQuery(lob);
    const locationScope = await resolveLocationScope(req);
    if (sendLocationScopeError(res, locationScope)) return;
    const params = [req.params.id, lob];

    let sql = `SELECT ic.partner_id, ic.is_visible, ic.marked_at, p.name AS partner_name
       FROM dbo.investor_clients ic
       JOIN dbo.partners p ON p.id = ic.partner_id
       WHERE ic.investor_id = $1 AND ic.lob = $2
       `;
    sql = appendCompanyScopeToSql({
      sql,
      params,
      companySql: 'p.companyid',
      companyIds: locationScope.companyIds,
    });
    sql += ' ORDER BY ic.marked_at DESC';

    const rows = await db(sql, params);

    return res.json({
      success: true,
      items: rows || [],
      visibleCount: (rows || []).filter((r) => r.is_visible).length,
    });
  } catch (err) {
    console.error('[investorAdmin] clients error:', err);
    return res.status(500).json({ error: 'Server error', code: 'E_FETCH_FAILED' });
  }
});

/**
 * GET /api/admin/investors/:id/audit
 */
router.get('/:id/audit', requirePermission('investors.manage'), async (req, res) => {
  try {
    const lob = resolveLob(req, req.query.lob);
    const db = getQuery(lob);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit || '50', 10) || 50), 200);
    const offset = Math.max(0, parseInt(req.query.offset || '0', 10) || 0);

    const rows = await db(
      `SELECT id, action, resource_id, row_count, ip_address, created_at
       FROM dbo.investor_view_audit
       WHERE investor_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );

    return res.json({ success: true, items: rows || [], limit, offset });
  } catch (err) {
    console.error('[investorAdmin] audit error:', err);
    return res.status(500).json({ error: 'Server error', code: 'E_FETCH_FAILED' });
  }
});

module.exports = router;

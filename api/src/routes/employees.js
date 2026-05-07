const express = require('express');
const { query } = require('../db');
const { requirePermission } = require('../middleware/auth');
const { attachLocationScopes, fetchLocationScopeIds } = require('./employees/locationScopes');
const { addAccentInsensitiveSearchCondition } = require('../utils/search');

const router = express.Router();

/**
 * GET /api/Employees
 * Query params: offset, limit, search, isDoctor, isAssistant, active, companyId
 * Returns: {offset, limit, totalItems, items[]}
 *
 * Used for: Doctor/assistant dropdowns, employee lists
 */
router.get('/', requirePermission('employees.view'), async (req, res) => {
  try {
    const {
      offset = '0',
      limit = '100',
      search = '',
      isDoctor = '',
      isAssistant = '',
      active = 'true',
      companyId = '',
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const conditions = ['1=1'];
    const params = [];
    let paramIdx = 1;

    // Active filter
    if (active === 'true') {
      conditions.push(`e.active = true`);
    } else if (active === 'false') {
      conditions.push(`e.active = false`);
    }

    // Company filter
    if (companyId) {
      conditions.push(`e.companyid = $${paramIdx}`);
      params.push(companyId);
      paramIdx++;
    }

    // Doctor filter
    if (isDoctor === 'true') {
      conditions.push(`e.isdoctor = true`);
    }

    // Assistant filter
    if (isAssistant === 'true') {
      conditions.push(`e.isassistant = true`);
    }

    // Search by name, ref, phone, email
    if (search) {
      paramIdx = addAccentInsensitiveSearchCondition({
        conditions,
        params,
        columns: ['e.name', 'e.namenosign', 'e.ref', 'e.phone', 'e.email', 'e.jobtitle'],
        search,
        paramIdx,
      });
    }

    const whereClause = conditions.join(' AND ');

    const items = await query(
      `SELECT
        e.id,
        e.name,
        e.ref,
        e.phone,
        e.email,
        e.avatar,
        e.isdoctor,
        e.isassistant,
        e.isreceptionist,
        e.active,
        e.jobtitle,
        e.companyid,
        c.name AS companyname,
        e.hrjobid,
        j.name AS hrjobname,
        e.wage,
        e.allowance,
        e.startworkdate,
        e.tier_id AS "tierId",
        pg.name AS "tierName",
        e.datecreated,
        e.lastupdated
      FROM employees e
      LEFT JOIN companies c ON c.id = e.companyid
      LEFT JOIN hrjobs j ON j.id = e.hrjobid
      LEFT JOIN permission_groups pg ON pg.id = e.tier_id
      WHERE ${whereClause}
      ORDER BY e.name ASC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM employees e WHERE ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    await attachLocationScopes(items);

    return res.json({
      offset: offsetNum,
      limit: limitNum,
      totalItems,
      items,
    });
  } catch (err) {
    console.error('Error fetching employees:', err);
    return res.status(500).json({
      offset: 0,
      limit: 20,
      totalItems: 0,
      items: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/Employees/:id
 * Returns: Single employee details
 */
router.get('/:id', requirePermission('employees.view'), async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT
        e.id,
        e.name,
        e.ref,
        e.phone,
        e.email,
        e.address,
        e.identitycard,
        e.birthday,
        e.avatar,
        e.isdoctor,
        e.isassistant,
        e.isreceptionist,
        e.active,
        e.companyid,
        c.name AS companyname,
        e.hrjobid,
        j.name AS hrjobname,
        e.wage,
        e.hourlywage,
        e.allowance,
        e.startworkdate,
        e.leavepermonth,
        e.regularhour,
        e.overtimerate,
        e.restdayrate,
        e.enrollnumber,
        e.medicalprescriptioncode,
        e.datecreated,
        e.lastupdated,
        e.tier_id AS "tierId",
        pg.name AS "tierName"
      FROM employees e
      LEFT JOIN companies c ON c.id = e.companyid
      LEFT JOIN hrjobs j ON j.id = e.hrjobid
      LEFT JOIN permission_groups pg ON pg.id = e.tier_id
      WHERE e.id = $1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    rows[0].locationScopeIds = await fetchLocationScopeIds(id);

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching employee:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

router.use('/', require('./employees/mutations'));

module.exports = router;

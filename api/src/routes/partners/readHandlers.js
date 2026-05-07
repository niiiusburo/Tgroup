const { query } = require('../../db');
const { applyPartnerListFilters } = require('./listFilters');
const { applyPartnerSearchFilter } = require('./searchFilters');

/**
 * Enforce customer visibility scope based on resolved permissions.
 *
 * @param {Object} req - Express request (expects req.userPermissions from requireAnyPermission)
 * @param {Object} query - Query params
 * @returns {{conditions: string[], params: any[], paramIdx: number, searchRequired: boolean}|{error: string, status: number}}
 */
function buildPartnerVisibilityScope(req, query) {
  const { effectivePermissions = [], locations = [] } = req.userPermissions || {};
  const isAdmin = effectivePermissions.includes('*');
  const hasViewAll = effectivePermissions.includes('customers.view_all')
    || effectivePermissions.includes('customers.view');
  const hasSearch = effectivePermissions.includes('customers.search');

  if (!isAdmin && !hasViewAll && !hasSearch) {
    return { error: 'Permission denied', status: 403 };
  }

  const conditions = ['p.customer = true', 'p.isdeleted = false'];
  const params = [];
  let paramIdx = 1;

  // ── Search-only enforcement ─────────────────────────────
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const searchRequired = !isAdmin && !hasViewAll;
  if (searchRequired) {
    if (!search || search.length < 2) {
      return {
        error: 'Search parameter is required (min 2 characters)',
        status: 403,
      };
    }
  }

  // ── Location scope enforcement ──────────────────────────
  if (!isAdmin) {
    const allowedLocationIds = locations.map((l) => l.id).filter(Boolean);
    const requestedCompanyId = query.companyId || query.company_id;

    if (typeof requestedCompanyId === 'string' && requestedCompanyId.trim()) {
      if (!allowedLocationIds.includes(requestedCompanyId.trim())) {
        return { error: 'Location not allowed', status: 403 };
      }
      // Requested location is valid; let applyPartnerListFilters add the exact filter
    } else if (allowedLocationIds.length > 0) {
      conditions.push(`p.companyid = ANY($${paramIdx})`);
      params.push(allowedLocationIds);
      paramIdx++;
    } else {
      // No locations assigned → empty result set
      conditions.push('FALSE');
    }
  }

  paramIdx = applyPartnerSearchFilter({ search, conditions, params, paramIdx });
  paramIdx = applyPartnerListFilters({ query, conditions, params, paramIdx });

  return { conditions, params, paramIdx, searchRequired };
}

/**
 * GET /api/Partners
 * Query params: offset, limit, search, sortField, sortOrder, filters
 * Returns: {offset, limit, totalItems, items[], aggregates}
 */
async function listPartners(req, res) {
  try {
    const {
      offset = '0',
      limit = '20',
      sortField = 'datecreated',
      sortOrder = 'desc',
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const allowedSortFields = {
      name: 'p.name',
      displayname: 'p.displayname',
      ref: 'p.ref',
      phone: 'p.phone',
      email: 'p.email',
      datecreated: 'p.datecreated',
      city: 'p.cityname',
      status: 'p.treatmentstatus',
    };

    const orderByCol = allowedSortFields[sortField] || 'p.datecreated';
    const orderDir = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const scope = buildPartnerVisibilityScope(req, req.query);
    if (scope.error) {
      return res.status(scope.status).json({
        offset: offsetNum,
        limit: limitNum,
        totalItems: 0,
        items: [],
        aggregates: { total: 0, active: 0, inactive: 0 },
        error: scope.error,
      });
    }

    const { conditions, params, paramIdx } = scope;
    const whereClause = conditions.join(' AND ');

    const items = await query(
      `SELECT
        p.id,
        p.ref AS code,
        p.displayname,
        p.name,
        p.phone,
        p.email,
        p.street,
        p.cityname AS city,
        p.districtname AS district,
        p.wardname AS ward,
        p.gender,
        p.birthyear,
        p.birthmonth,
        p.birthday,
        p.medicalhistory,
        p.comment,
        p.note,
        p.active AS status,
        p.treatmentstatus,
        p.sourceid, cs.name AS sourcename, p.referraluserid,
        p.agentid,
        a.name AS agentname,
        p.cskhid,
        cskh_staff.name AS cskhname,
        p.salestaffid,
        sales_staff.name AS salestaffname,
        p.companyid,
        c.name AS companyname,
        p.datecreated,
        p.lastupdated,
        p.createdbyid,
        p.writebyid,
        p.avatar,
        p.zaloid,
        p.taxcode,
        p.identitynumber,
        p.healthinsurancecardnumber,
        p.emergencyphone,
        p.weight,
        0 AS appointmentcount,
        0 AS ordercount,
        0 AS dotkhamcount
      FROM partners p LEFT JOIN customersources cs ON cs.id = p.sourceid
      LEFT JOIN companies c ON c.id = p.companyid
      LEFT JOIN agents a ON a.id = p.agentid
      LEFT JOIN partners cskh_staff ON cskh_staff.id = p.cskhid
      LEFT JOIN partners sales_staff ON sales_staff.id = p.salestaffid
      WHERE ${whereClause}
      ORDER BY ${orderByCol} ${orderDir} NULLS LAST
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    // Single query: get total, active, and inactive counts in one pass
    const countResult = await query(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE p.active = true)::int AS active,
        COUNT(*) FILTER (WHERE p.active = false)::int AS inactive
      FROM partners p WHERE ${whereClause}`,
      params
    );
    const totalItems = countResult[0]?.total || 0;

    const aggregates = {
      total: totalItems,
      active: countResult[0]?.active || 0,
      inactive: countResult[0]?.inactive || 0,
    };

    return res.json({
      offset: offsetNum,
      limit: limitNum,
      totalItems,
      items,
      aggregates,
    });
  } catch (err) {
    console.error('Error fetching partners:', err);
    return res.status(500).json({
      offset: 0,
      limit: 20,
      totalItems: 0,
      items: [],
      aggregates: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

async function checkPartnerUnique(req, res) {
  try {
    const { field, value, excludeId } = req.query;

    if (!field || !['phone', 'email'].includes(field)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION',
          message: "Tham số 'field' phải là 'phone' hoặc 'email'",
        },
      });
    }
    const trimmed = typeof value === 'string' ? value.trim() : '';

    if (!trimmed) {
      return res.json({ unique: true });
    }

    if (field === 'phone') {
      return res.json({ unique: true });
    }

    let rows;
    // email — case-insensitive comparison
    if (excludeId) {
      rows = await query(
        'SELECT id FROM partners WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1',
        [trimmed, excludeId]
      );
    } else {
      rows = await query(
        'SELECT id FROM partners WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [trimmed]
      );
    }

    if (rows && rows.length > 0) {
      return res.json({ unique: false, conflictField: field });
    }

    return res.json({ unique: true });
  } catch (err) {
    console.error('Error checking field uniqueness:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

/**
 * GET /api/Partners/:id/GetKPIs
 * Returns: {totalTreatmentAmount, expectedRevenue, actualRevenue, debt, advancePayment, pointBalance}
 */
async function getPartnerKpis(req, res) {
  try {
    const { id } = req.params;

    const kpiResult = await query(
      `SELECT
        COALESCE((
          SELECT SUM(sol.pricetotal)
          FROM saleorderlines sol
          JOIN saleorders so ON so.id = sol.orderid
          WHERE so.partnerid = $1 AND so.isdeleted = false AND sol.isdeleted = false
        ), 0) AS totaltreatmentamount,
        COALESCE((
          SELECT SUM(so.amounttotal)
          FROM saleorders so
          WHERE so.partnerid = $1 AND so.isdeleted = false
        ), 0) AS expectedrevenue,
        COALESCE((
          SELECT SUM(so.totalpaid)
          FROM saleorders so
          WHERE so.partnerid = $1 AND so.isdeleted = false
        ), 0) AS actualrevenue,
        COALESCE((
          SELECT SUM(so.residual)
          FROM saleorders so
          WHERE so.partnerid = $1 AND so.isdeleted = false
        ), 0) AS debt,
        COALESCE((
          SELECT SUM(ap.amount)
          FROM accountpayments ap
          WHERE ap.partnerid = $1 AND ap.paymenttype = 'inbound' AND ap.state = 'posted'
        ), 0) AS advancepayment,
        0 AS pointbalance`,
      [id]
    );

    const kpi = kpiResult[0] || {};

    return res.json({
      totalTreatmentAmount: parseFloat(kpi.totaltreatmentamount || 0),
      expectedRevenue: parseFloat(kpi.expectedrevenue || 0),
      actualRevenue: parseFloat(kpi.actualrevenue || 0),
      debt: parseFloat(kpi.debt || 0),
      advancePayment: parseFloat(kpi.advancepayment || 0),
      pointBalance: parseInt(kpi.pointbalance || 0, 10),
    });
  } catch (err) {
    console.error('Error fetching partner KPIs:', err);
    return res.status(500).json({
      totalTreatmentAmount: 0,
      expectedRevenue: 0,
      actualRevenue: 0,
      debt: 0,
      advancePayment: 0,
      pointBalance: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

module.exports = {
  checkPartnerUnique,
  getPartnerKpis,
  listPartners,
};

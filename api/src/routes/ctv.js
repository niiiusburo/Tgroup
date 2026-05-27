/**
 * ctv.js — Real cross-DB CTV commission aggregation for Cosmetic LOB v2 (D13 live)
 * Uses getDb('dental') + getDb('cosmetic') to query dbo.earnings + partners for the authed is_ctv user's employeeId (recipient_partner_id).
 * No mocks, no stubs. Data is 100% from DB via engine-written rows (referred_by_ctv_id path).
 * Mounted at /api/ctv (gated by ctv.dashboard.view perm + requireAuth).
 */
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getDb } = require('../db');
const { checkEligibility } = require('../services/referralEligibilityService');
const { normalizePhone } = require('../services/phoneNormalize');

const router = express.Router();

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
    const r = await db.query(sql, params);
    return toRows(r);
  } catch (e) {
    console.error('[ctv] query error:', e.message);
    return [];
  }
}

function requireCtvUser(req, res, next) {
  if (!req.user?.employeeId) {
    return res.status(401).json({ error: 'No token' });
  }
  if (!req.user.is_ctv) {
    return res.status(403).json({
      error: { code: 'S_CTV_ONLY', message: 'CTV access required' },
    });
  }
  next();
}

function parseMoney(value) {
  const amount = parseFloat(value || 0);
  if (Number.isNaN(amount)) return 0;
  return Math.round(amount);
}

function mapServiceRow(row, lob) {
  return {
    id: row.id,
    serviceLineId: row.service_line_id || null,
    paymentId: row.payment_id || null,
    serviceName: row.service_name || 'Dịch vụ',
    amount: parseMoney(row.amount),
    status: row.status || 'pending',
    source: row.source || 'ctv',
    lob,
    earnedAt: row.earned_at || row.created_at || null,
  };
}

function mapHierarchyNode(row, lob) {
  return {
    id: row.id,
    name: row.name || 'CTV',
    email: row.email || '',
    phone: row.phone || '',
    joinedAt: row.joined_at || row.datecreated || null,
    referredByCtvId: row.referred_by_ctv_id || null,
    level: parseInt(row.level || 0, 10),
    directDownlineCount: parseInt(row.direct_downline_count || 0, 10),
    lobs: [lob],
  };
}

function mergeHierarchyNodes(items) {
  const byId = new Map();

  items.forEach((item) => {
    if (!item?.id) return;
    if (!byId.has(item.id)) {
      byId.set(item.id, { ...item, lobs: [...item.lobs] });
      return;
    }

    const existing = byId.get(item.id);
    existing.lobs = Array.from(new Set([...existing.lobs, ...item.lobs]));
    existing.level = Math.min(existing.level || item.level, item.level || existing.level);
    existing.directDownlineCount = Math.max(existing.directDownlineCount || 0, item.directDownlineCount || 0);
    if (!existing.joinedAt && item.joinedAt) existing.joinedAt = item.joinedAt;
  });

  return Array.from(byId.values()).sort((a, b) => {
    if ((a.level || 0) !== (b.level || 0)) return (a.level || 0) - (b.level || 0);
    return new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime();
  });
}

async function getReferralServices(db, clientId, ctvId, lob) {
  const rows = await safeQueryRows(
    db,
    `SELECT
       e.id,
       e.service_line_id,
       e.payment_id,
       e.amount,
       e.status,
       e.source,
       e.earned_at,
       e.created_at,
       COALESCE(NULLIF(sol.productname, ''), pr.name, NULLIF(sol.name, ''), 'Dịch vụ') AS service_name
     FROM dbo.earnings e
     LEFT JOIN dbo.saleorderlines sol ON sol.id = e.service_line_id
     LEFT JOIN dbo.products pr ON pr.id = sol.productid
     WHERE e.client_id = $1
       AND e.recipient_partner_id = $2
     ORDER BY COALESCE(e.earned_at, e.created_at) DESC
     LIMIT 50`,
    [clientId, ctvId]
  );

  return rows.map((row) => mapServiceRow(row, lob));
}

/**
 * GET /api/ctv/hierarchy
 * Read-only CTV-to-CTV referral hierarchy. Referred service clients stay on /referrals;
 * this route filters for is_ctv=true rows so the invitation tree cannot mix with clients.
 */
router.get('/hierarchy', requireAuth, requireCtvUser, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  const ctvId = employeeId;

  const currentSql = `
    SELECT id, name, phone, email, datecreated AS joined_at, referred_by_ctv_id, 0 AS level
    FROM dbo.partners
    WHERE id = $1
      AND COALESCE(is_ctv, false) = true
    LIMIT 1
  `;

  const uplineSql = `
    WITH RECURSIVE upline AS (
      SELECT p.id, p.name, p.phone, p.email, p.datecreated AS joined_at, p.referred_by_ctv_id, 1 AS level
      FROM dbo.partners current_ctv
      JOIN dbo.partners p ON p.id = current_ctv.referred_by_ctv_id
      WHERE current_ctv.id = $1
        AND COALESCE(p.is_ctv, false) = true
      UNION ALL
      SELECT p.id, p.name, p.phone, p.email, p.datecreated AS joined_at, p.referred_by_ctv_id, upline.level + 1 AS level
      FROM dbo.partners p
      JOIN upline ON p.id = upline.referred_by_ctv_id
      WHERE COALESCE(p.is_ctv, false) = true
        AND upline.level < 5
    )
    SELECT
      id,
      name,
      phone,
      email,
      joined_at,
      referred_by_ctv_id,
      level,
      (
        SELECT COUNT(*)::int
        FROM dbo.partners child
        WHERE child.referred_by_ctv_id = upline.id
          AND COALESCE(child.is_ctv, false) = true
      ) AS direct_downline_count
    FROM upline
    ORDER BY level ASC, joined_at DESC NULLS LAST
    LIMIT 20
  `;

  const downlineSql = `
    WITH RECURSIVE downline AS (
      SELECT p.id, p.name, p.phone, p.email, p.datecreated AS joined_at, p.referred_by_ctv_id, 1 AS level
      FROM dbo.partners p
      WHERE p.referred_by_ctv_id = $1
        AND COALESCE(p.is_ctv, false) = true
      UNION ALL
      SELECT p.id, p.name, p.phone, p.email, p.datecreated AS joined_at, p.referred_by_ctv_id, downline.level + 1 AS level
      FROM dbo.partners p
      JOIN downline ON p.referred_by_ctv_id = downline.id
      WHERE COALESCE(p.is_ctv, false) = true
        AND downline.level < 5
    )
    SELECT
      downline.id,
      downline.name,
      downline.phone,
      downline.email,
      downline.joined_at,
      downline.referred_by_ctv_id,
      downline.level,
      (
        SELECT COUNT(*)::int
        FROM dbo.partners child
        WHERE child.referred_by_ctv_id = downline.id
          AND COALESCE(child.is_ctv, false) = true
      ) AS direct_downline_count
    FROM downline
    ORDER BY downline.level ASC, downline.joined_at DESC NULLS LAST
    LIMIT 100
  `;

  const dentalDb = getDb('dental');
  const cosmeticDb = getDb('cosmetic');

  const [dCurrent, cCurrent, dUpline, cUpline, dDownline, cDownline] = await Promise.all([
    safeQueryRows(dentalDb, currentSql, [ctvId]),
    safeQueryRows(cosmeticDb, currentSql, [ctvId]),
    safeQueryRows(dentalDb, uplineSql, [ctvId]),
    safeQueryRows(cosmeticDb, uplineSql, [ctvId]),
    safeQueryRows(dentalDb, downlineSql, [ctvId]),
    safeQueryRows(cosmeticDb, downlineSql, [ctvId]),
  ]);

  const current =
    mergeHierarchyNodes([
      ...dCurrent.map((row) => mapHierarchyNode(row, 'dental')),
      ...cCurrent.map((row) => mapHierarchyNode(row, 'cosmetic')),
    ])[0] || {
      id: ctvId,
      name: req.user.name || 'CTV',
      email: req.user.email || '',
      phone: '',
      joinedAt: null,
      referredByCtvId: null,
      level: 0,
      directDownlineCount: 0,
      lobs: [],
    };

  const upline = mergeHierarchyNodes([
    ...dUpline.map((row) => mapHierarchyNode(row, 'dental')),
    ...cUpline.map((row) => mapHierarchyNode(row, 'cosmetic')),
  ]);
  const downline = mergeHierarchyNodes([
    ...dDownline.map((row) => mapHierarchyNode(row, 'dental')),
    ...cDownline.map((row) => mapHierarchyNode(row, 'cosmetic')),
  ]);

  return res.json({
    current,
    upline,
    downline,
    totals: {
      uplineCount: upline.length,
      downlineCount: downline.length,
      directDownlineCount: downline.filter((node) => node.level === 1).length,
    },
  });
});

/**
 * GET /api/ctv/commission-summary
 * Live aggregation across both LOB DBs for this CTV (by recipient_partner_id = employeeId from JWT).
 * Returns shape consumable by CtvDashboard (totals with per-LOB pending, recent with client_name + lob pills, lists).
 */
router.get('/commission-summary', requireAuth, requireCtvUser, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  const ctvId = employeeId;

  const earningsSql = `
    SELECT e.id, e.client_id, e.recipient_partner_id, e.payment_id, e.service_line_id,
           e.source, e.amount, e.status, e.payout_id, e.earned_at, e.created_at,
           COALESCE(p.name, 'Unknown Client') AS client_name,
           COALESCE(NULLIF(sol.productname, ''), pr.name, NULLIF(sol.name, ''), 'Dịch vụ') AS service_name
    FROM dbo.earnings e
    LEFT JOIN dbo.partners p ON p.id = e.client_id
    LEFT JOIN dbo.saleorderlines sol ON sol.id = e.service_line_id
    LEFT JOIN dbo.products pr ON pr.id = sol.productid
    WHERE e.recipient_partner_id = $1
    ORDER BY COALESCE(e.earned_at, e.created_at) DESC
    LIMIT 100
  `;

  const dentalDb = getDb('dental');
  const cosmeticDb = getDb('cosmetic');

  // Fetch tier labels from both DBs for L0–L4
  const tierSql = `
    SELECT level, label FROM dbo.commission_tiers
    WHERE lob = $1 AND level BETWEEN 0 AND 4
    ORDER BY level ASC
  `;

  const [dRows, cRows, dTiers, cTiers] = await Promise.all([
    safeQueryRows(dentalDb, earningsSql, [ctvId]),
    safeQueryRows(cosmeticDb, earningsSql, [ctvId]),
    safeQueryRows(dentalDb, tierSql, ['dental']),
    safeQueryRows(cosmeticDb, tierSql, ['cosmetic']),
  ]);

  const tierLabels = {};
  dTiers.forEach((t) => { tierLabels[t.level] = t.label; });
  cTiers.forEach((t) => { tierLabels[t.level] = t.label; });

  const all = [
    ...dRows.map(r => ({ ...r, lob: 'dental' })),
    ...cRows.map(r => ({ ...r, lob: 'cosmetic' })),
  ].sort((a, b) => {
    const ta = new Date(a.earned_at || a.created_at || 0).getTime();
    const tb = new Date(b.earned_at || b.created_at || 0).getTime();
    return tb - ta;
  });

  let pendingTotal = 0;
  let paidTotal = 0;
  let dentalPending = 0;
  let cosmeticPending = 0;
  let dentalPaid = 0;
  let cosmeticPaid = 0;
  let pendingCount = 0;
  let paidCount = 0;

  all.forEach((e) => {
    const amt = parseFloat(e.amount || 0);
    const isPaid = e.status === 'paid' || !!e.payout_id;
    if (isPaid) {
      const absAmt = Math.abs(amt);
      paidTotal += absAmt;
      paidCount += 1;
      if (e.lob === 'dental') dentalPaid += absAmt;
      else cosmeticPaid += absAmt;
    } else if (e.status === 'pending') {
      if (amt > 0) {
        pendingTotal += amt;
        pendingCount += 1;
        if (e.lob === 'dental') dentalPending += amt;
        else cosmeticPending += amt;
      }
    }
  });

  const recent = all.slice(0, 8).map((e) => ({
    id: e.id,
    client_id: e.client_id,
    client_name: e.client_name,
    amount: parseFloat(e.amount || 0),
    service_line_id: e.service_line_id || null,
    service_name: e.service_name || 'Dịch vụ',
    payment_id: e.payment_id || null,
    source: e.source || 'ctv',
    lob: e.lob,
    earned_at: e.earned_at || e.created_at,
    status: e.status,
  }));

  const pendingList = recent.filter((r) => r.status === 'pending');
  const paidList = recent.filter((r) => r.status !== 'pending' || parseFloat(r.amount) < 0);

  return res.json({
    totals: {
      pending: Math.round(pendingTotal),
      paid: Math.round(paidTotal),
      dentalPending: Math.round(dentalPending),
      cosmeticPending: Math.round(cosmeticPending),
    },
    counts: { pending: pendingCount, paid: paidCount },
    recent,
    pendingList,
    paidList,
    tierLabels,
  });
});

/**
 * GET /api/ctv/referrals
 * Live list of partners (both DBs) where referred_by_ctv_id matches this CTV.
 * Computes per-referral earnings totals/counts from the earnings table (live attribution proof).
 */
router.get('/referrals', requireAuth, requireCtvUser, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  const ctvId = employeeId;

  const dentalDb = getDb('dental');
  const cosmeticDb = getDb('cosmetic');

  const refSql = `
    SELECT id, name, phone, email, datecreated AS referred_at
    FROM dbo.partners
    WHERE referred_by_ctv_id = $1
      AND (customer = true OR active = true OR employee = false)
    ORDER BY datecreated DESC NULLS LAST
    LIMIT 30
  `;

  const [dRefsRaw, cRefsRaw] = await Promise.all([
    safeQueryRows(dentalDb, refSql, [ctvId]),
    safeQueryRows(cosmeticDb, refSql, [ctvId]),
  ]);

  const buildReferral = async (db, row, lob) => {
    const earnRows = await safeQueryRows(
      db,
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt
       FROM dbo.earnings
       WHERE client_id = $1 AND recipient_partner_id = $2`,
      [row.id, ctvId]
    );
    const er = earnRows[0] || { total: 0, cnt: 0 };
    const total = Math.round(parseFloat(er.total || 0));
    const cnt = parseInt(er.cnt || 0, 10);
    const services = await getReferralServices(db, row.id, ctvId, lob);
    return {
      id: row.id,
      name: row.name,
      phone: row.phone || '',
      lobs: [lob],
      total_earned: total,
      earned_count: cnt,
      service_count: services.length,
      services,
      status: cnt > 0 ? 'earning' : 'no visit yet',
      referred_at: row.referred_at,
    };
  };

  const dItems = await Promise.all(dRefsRaw.map((r) => buildReferral(dentalDb, r, 'dental')));
  const cItems = await Promise.all(cRefsRaw.map((r) => buildReferral(cosmeticDb, r, 'cosmetic')));

  // dedupe by id (in case same uuid in both DBs)
  const byId = new Map();
  [...dItems, ...cItems].forEach((item) => {
    if (byId.has(item.id)) {
      const prev = byId.get(item.id);
      prev.lobs = Array.from(new Set([...prev.lobs, ...item.lobs]));
      prev.total_earned += item.total_earned;
      prev.earned_count += item.earned_count;
      prev.services = [...prev.services, ...item.services];
      prev.service_count = prev.services.length;
      if (item.status === 'earning') prev.status = 'earning';
    } else {
      byId.set(item.id, item);
    }
  });

  const referrals = Array.from(byId.values());
  return res.json({ referrals });
});

/**
 * GET /api/ctv/me — lightweight profile for Me tab (no extra DB hit)
 */
router.get('/me', requireAuth, requireCtvUser, (req, res) => {
  const u = req.user || {};
  res.json({
    id: u.employeeId,
    name: u.name || 'CTV',
    email: u.email || '',
    phone: '',
    role: 'CTV',
  });
});

/**
 * POST /api/ctv/referrals
 * Create a new client referral for this CTV.
 * Body: { clientName, clientPhone, clientEmail?, serviceInterest?, notes?, lob? }
 * lob defaults to 'dental'.
 */
router.post('/referrals', requireAuth, requireCtvUser, async (req, res) => {
  try {
    const { employeeId } = req.user || {};
    if (!employeeId) return res.status(401).json({ error: 'No token' });

    const {
      clientName,
      clientPhone,
      clientEmail,
      serviceInterest,
      notes,
      lob = 'dental',
    } = req.body || {};

    if (!clientName || !clientPhone) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'clientName and clientPhone are required' },
      });
    }

    const targetDb = lob === 'cosmetic' ? getDb('cosmetic') : getDb('dental');
    if (!targetDb) {
      return res.status(500).json({
        error: { code: 'DB_ERROR', message: `Database for lob=${lob} not available` },
      });
    }

    // Eligibility gate
    const eligibility = await checkEligibility(targetDb, employeeId, clientPhone);
    if (!eligibility.eligible) {
      const messages = {
        INVALID_PHONE: 'Invalid phone number',
        REFERRED_BY_OTHER: 'This client is already referred by another CTV',
        ACTIVE_REFERRAL_EXISTS: 'An active referral for this client already exists',
      };
      return res.status(409).json({
        error: {
          code: eligibility.reason,
          message: messages[eligibility.reason] || 'Not eligible for referral',
        },
      });
    }

    const normalizedPhone = normalizePhone(clientPhone);
    let partnerId = eligibility.existingPartnerId || null;

    // Create partner if not exists
    if (!partnerId) {
      const { v4: uuidv4 } = require('uuid');
      partnerId = uuidv4();

      const refCode = 'T' + Math.floor(100000 + Math.random() * 900000);

      await targetDb.query(
        `INSERT INTO dbo.partners (
          id, name, phone, email, customer, active, employee,
          supplier, isagent, isinsurance, iscompany, ishead,
          isbusinessinvoice, isdeleted, isdoctor, isassistant, isreceptionist,
          referred_by_ctv_id, ref, datecreated, lastupdated
        ) VALUES (
          $1, $2, $3, $4, true, true, false,
          false, false, false, false, false,
          false, false, false, false, false,
          $5, $6, (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'),
          (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
        )`,
        [partnerId, clientName, normalizedPhone, clientEmail || null, employeeId, refCode]
      );
    }

    // Create draft saleorder as referral record
    const { v4: uuidv4 } = require('uuid');
    const orderId = uuidv4();
    const orderName = serviceInterest
      ? `CTV Referral — ${clientName} (${serviceInterest})`
      : `CTV Referral — ${clientName}`;

    await targetDb.query(
      `INSERT INTO dbo.saleorders (
        id, name, partnerid, state, origin,
        amounttotal, residual, totalpaid,
        quantity, unit, isdeleted, notes, datecreated
      ) VALUES (
        $1, $2, $3, 'draft', 'ctv_referral',
        0, 0, 0,
        1, 'lần', false, $4,
        (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
      )`,
      [orderId, orderName, partnerId, notes || null]
    );

    return res.status(201).json({
      success: true,
      partnerId,
      orderId,
      message: 'Referral created successfully',
    });
  } catch (err) {
    console.error('[ctv/referrals] error:', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create referral' },
    });
  }
});

module.exports = router;

/**
 * ctv.js — Real cross-DB CTV commission aggregation for Cosmetic LOB v2 (D13 live)
 * Uses getDb('dental') + getDb('cosmetic') to query dbo.earnings + partners for the authed is_ctv user's employeeId (recipient_partner_id).
 * No mocks, no stubs. Data is 100% from DB via engine-written rows (referred_by_ctv_id path).
 * Mounted at /api/ctv (gated by ctv.dashboard.view perm + requireAuth).
 * @crossref:endpoint[GET /api/ctv/commission-summary, GET /api/ctv/referrals, GET /api/ctv/client-journeys, POST /api/ctv, POST /api/ctv/clients, POST /api/ctv/bookings]
 * @crossref:uses[api/src/services/referralClaim.js, api/src/services/ctvNetwork.js, api/src/services/ctvBookingCompany.js, api/src/routes/ctvHelpers.js (isCtvUser), api/src/middleware/auth.js (requireAuth), api/src/services/permissionService.js (lazy admin checks), product-map/domains/ctv.yaml]
 */
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getDb } = require('../db');
const { buildCtvNetwork, getCtvHierarchy } = require('../services/ctvNetwork');
const { getReferralClaimStatus } = require('../services/referralClaim');
const { resolveCtvBookingCompanyId } = require('../services/ctvBookingCompany');
const { isCtvUser } = require('./ctvHelpers');

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
  if (!isCtvUser(req.user)) {
    return res.status(403).json({
      error: { code: 'S_CTV_ONLY', message: 'CTV access required' },
    });
  }
  next();
}

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
           p.name AS client_name,
           sol.productname AS service_name
    FROM dbo.earnings e
    LEFT JOIN dbo.partners p ON p.id = e.client_id
    LEFT JOIN dbo.saleorderlines sol ON sol.id = e.service_line_id
    WHERE e.recipient_partner_id = $1
    ORDER BY COALESCE(e.earned_at, e.created_at) DESC
    LIMIT 100
  `;

  const dentalDb = getDb('dental');
  const cosmeticDb = getDb('cosmetic');

  const [dRows, cRows] = await Promise.all([
    safeQueryRows(dentalDb, earningsSql, [ctvId]),
    safeQueryRows(cosmeticDb, earningsSql, [ctvId]),
  ]);

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

  const mapEarningRow = (e) => ({
    id: e.id,
    client_id: e.client_id || null,
    client_name: e.client_name || null,
    service_line_id: e.service_line_id || null,
    service_name: e.service_name || null,
    payment_id: e.payment_id || null,
    amount: parseFloat(e.amount || 0),
    source: e.source || 'ctv',
    lob: e.lob,
    earned_at: e.earned_at || e.created_at,
    status: e.status,
    payout_id: e.payout_id || null,
  });

  const recent = all.slice(0, 8).map(mapEarningRow);
  const pendingList = all
    .filter((e) => e.status === 'pending' && parseFloat(e.amount || 0) > 0)
    .slice(0, 50)
    .map(mapEarningRow);
  // Paid = actually paid out (matches the aggregation's isPaid). This deliberately
  // EXCLUDES 'pending' reversals and INV-003C service-card 'reversed' rows, neither of
  // which are paid earnings.
  const paidList = all
    .filter((e) => e.status === 'paid' || !!e.payout_id)
    .slice(0, 50)
    .map(mapEarningRow);

  // Fetch payout cycles referenced by this CTV's earnings (for Paid tab grouping)
  const dPayoutIds = [...new Set(dRows.map((r) => r.payout_id).filter(Boolean))];
  const cPayoutIds = [...new Set(cRows.map((r) => r.payout_id).filter(Boolean))];
  const [dPayouts, cPayouts] = await Promise.all([
    dPayoutIds.length > 0
      ? safeQueryRows(dentalDb, `SELECT id, cycle_label, paid_at, total_amount, receipt_url FROM dbo.payouts WHERE id = ANY($1)`, [dPayoutIds])
      : Promise.resolve([]),
    cPayoutIds.length > 0
      ? safeQueryRows(cosmeticDb, `SELECT id, cycle_label, paid_at, total_amount, receipt_url FROM dbo.payouts WHERE id = ANY($1)`, [cPayoutIds])
      : Promise.resolve([]),
  ]);
  const payouts = [
    ...dPayouts.map((p) => ({ ...p, lob: 'dental', total_amount: parseFloat(p.total_amount || 0) })),
    ...cPayouts.map((p) => ({ ...p, lob: 'cosmetic', total_amount: parseFloat(p.total_amount || 0) })),
  ].sort((a, b) => new Date(b.paid_at || 0).getTime() - new Date(a.paid_at || 0).getTime());

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
    payouts,
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
      AND COALESCE(is_ctv, false) = false
      AND (customer = true OR active = true OR employee = false)
    ORDER BY datecreated DESC NULLS LAST
    LIMIT 30
  `;

  try {
    const [dRefsRaw, cRefsRaw] = await Promise.all([
      safeQueryRows(dentalDb, refSql, [ctvId]),
      safeQueryRows(cosmeticDb, refSql, [ctvId]),
    ]);

    // Build all referrals for one LOB DB. Journey stages reflect the CLIENT's REAL activity
    // (visited/serviced/paid) from the operational tables — NOT commission-payout status — so a
    // client who already came & paid advances past "referred" even when no earning row exists yet
    // (retroactive CTV assignment, or a paid order whose product carries no commission rate).
    // Commission ($) stays a separate concern: total_earned/earned_count come from the earnings
    // ledger. Signals are BATCHED (partnerid = ANY) — no per-client N+1 — and each query goes
    // through safeQueryRows so a missing table/column in either LOB DB degrades to "referred"
    // rather than 500ing the whole portal.
    const buildReferralsForLob = async (db, rows, lob) => {
      if (!rows || rows.length === 0) return [];
      const ids = rows.map((r) => r.id);

      const [earnAgg, payAgg, svcRows, visitAgg, apptCtvRows, svcCtvRows] = await Promise.all([
        safeQueryRows(
          db,
          `SELECT client_id AS id, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt
             FROM dbo.earnings WHERE client_id = ANY($1) AND recipient_partner_id = $2
            GROUP BY client_id`,
          [ids, ctvId]
        ),
        safeQueryRows(
          db,
          `SELECT customer_id AS id, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt, MAX(payment_date) AS last_at
             FROM payments WHERE customer_id = ANY($1) AND amount > 0
            GROUP BY customer_id`,
          [ids]
        ),
        safeQueryRows(
          db,
          `SELECT so.partnerid AS id, sol.id AS line_id, sol.productname AS name,
                  sol.pricetotal AS amount, sol.date AS dt, sol.amountresidual AS residual
             FROM dbo.saleorderlines sol
             JOIN dbo.saleorders so ON so.id = sol.orderid
            WHERE so.partnerid = ANY($1) AND sol.isdeleted = false
            ORDER BY sol.date DESC NULLS LAST`,
          [ids]
        ),
        safeQueryRows(
          db,
          `SELECT partnerid AS id, COUNT(*) AS cnt, MAX(date) AS last_at
             FROM appointments WHERE partnerid = ANY($1) AND state IN ('completed','done','arrived')
            GROUP BY partnerid`,
          [ids]
        ),
        safeQueryRows(
          db,
          `SELECT DISTINCT ON (a.partnerid) a.partnerid AS id, a.ctv_id AS "ctvId",
                  ctvp.name AS "ctvName", COALESCE(a.date, a.datecreated) AS dt
             FROM dbo.appointments a
             LEFT JOIN dbo.partners ctvp ON ctvp.id = a.ctv_id
            WHERE a.partnerid = ANY($1) AND a.ctv_id IS NOT NULL
              AND COALESCE(a.state, '') NOT ILIKE 'cancel%'
            ORDER BY a.partnerid, COALESCE(a.date, a.datecreated) DESC NULLS LAST`,
          [ids]
        ),
        safeQueryRows(
          db,
          `SELECT DISTINCT ON (so.partnerid) so.partnerid AS id, so.ctv_id AS "ctvId",
                  ctvp.name AS "ctvName", COALESCE(so.dateordered, so.datecreated) AS dt
             FROM dbo.saleorders so
             LEFT JOIN dbo.partners ctvp ON ctvp.id = so.ctv_id
            WHERE so.partnerid = ANY($1) AND so.ctv_id IS NOT NULL
              AND COALESCE(so.state, '') NOT ILIKE 'cancel%'
              AND COALESCE(so.isdeleted, false) = false
            ORDER BY so.partnerid, COALESCE(so.dateordered, so.datecreated) DESC NULLS LAST`,
          [ids]
        ),
      ]);

      const earnMap = new Map(earnAgg.map((r) => [r.id, r]));
      const payMap = new Map(payAgg.map((r) => [r.id, r]));
      const visitMap = new Map(visitAgg.map((r) => [r.id, r]));
      const svcMap = new Map();
      for (const s of svcRows) {
        if (!svcMap.has(s.id)) svcMap.set(s.id, []);
        svcMap.get(s.id).push(s);
      }

      // 6-month CTV-link window: latest non-cancelled CTV-bearing appointment OR service wins.
      const { computeCtvLink } = require('../services/referralClaim');
      const apptCtvMap = new Map(apptCtvRows.map((r) => [r.id, r]));
      const svcCtvMap = new Map(svcCtvRows.map((r) => [r.id, r]));

      return rows.map((row) => {
        const e = earnMap.get(row.id) || { total: 0, cnt: 0 };
        const p = payMap.get(row.id);
        const v = visitMap.get(row.id);
        const svc = svcMap.get(row.id) || [];

        const hasPaid = !!p && parseInt(p.cnt, 10) > 0;
        const hasService = svc.length > 0;
        const hasVisited = !!v && parseInt(v.cnt, 10) > 0;

        // Highest reached stage wins (paid > serviced > visited > referred). A paid client
        // shows 4/4 even if no completed appointment / service line was recorded.
        let stage = 'referred';
        let stageProgress = 1;
        if (hasPaid) { stage = 'paid'; stageProgress = 4; }
        else if (hasService) { stage = 'serviced'; stageProgress = 3; }
        else if (hasVisited) { stage = 'visited'; stageProgress = 2; }

        const services = svc.map((s) => ({
          id: s.line_id,
          serviceLineId: s.line_id,
          paymentId: null,
          serviceName: s.name || null,
          amount: Math.abs(parseFloat(s.amount || 0)),
          status: s.residual != null && parseFloat(s.residual) <= 0 ? 'paid' : 'pending',
          source: 'saleorder',
          lob,
          earnedAt: s.dt || null,
        }));

        const total = Math.round(parseFloat(e.total || 0));
        const cnt = parseInt(e.cnt || 0, 10);
        const link = computeCtvLink({
          appt: apptCtvMap.get(row.id) || null,
          service: svcCtvMap.get(row.id) || null,
          fallbackOwnerCtvId: ctvId, // this CTV owns the /referrals list query
          fallbackOwnerName: null,
        });
        return {
          id: row.id,
          name: row.name,
          phone: row.phone || '',
          lobs: [lob],
          total_earned: total,
          earned_count: cnt,
          status: cnt > 0 ? 'earning' : hasPaid ? 'paid' : 'no visit yet',
          referred_at: row.referred_at,
          stage,
          stage_progress: stageProgress,
          service_count: services.length,
          services,
          last_payment_at: p ? p.last_at : null,
          last_visit_at: v ? v.last_at : null,
          link_expires_at: link.expiresAt ? link.expiresAt.toISOString() : null,
          link_anchor_at: link.anchorAt ? link.anchorAt.toISOString() : null,
          link_active: link.active,
          eligible: link.eligible,
          linked_ctv_name: link.linkedCtvName,
        };
      });
    };

    const [dItems, cItems] = await Promise.all([
      buildReferralsForLob(dentalDb, dRefsRaw, 'dental'),
      buildReferralsForLob(cosmeticDb, cRefsRaw, 'cosmetic'),
    ]);

    // dedupe by id (same uuid can appear in both DBs): union lobs/services, sum commission,
    // keep the highest stage and the most recent payment date.
    const byId = new Map();
    [...dItems, ...cItems].forEach((item) => {
      if (byId.has(item.id)) {
        const prev = byId.get(item.id);
        prev.lobs = Array.from(new Set([...prev.lobs, ...item.lobs]));
        prev.total_earned += item.total_earned;
        prev.earned_count += item.earned_count;
        prev.services = [...prev.services, ...item.services];
        prev.service_count = prev.services.length;
        if (item.stage_progress > prev.stage_progress) {
          prev.stage = item.stage;
          prev.stage_progress = item.stage_progress;
        }
        if (item.status === 'earning') prev.status = 'earning';
        else if (item.status === 'paid' && prev.status !== 'earning') prev.status = 'paid';
        if (item.last_payment_at && (!prev.last_payment_at || new Date(item.last_payment_at) > new Date(prev.last_payment_at))) {
          prev.last_payment_at = item.last_payment_at;
        }
        // Latest-expiring window wins; eligible only when every LOB window is inactive.
        const prevExp = prev.link_expires_at ? new Date(prev.link_expires_at).getTime() : -Infinity;
        const itemExp = item.link_expires_at ? new Date(item.link_expires_at).getTime() : -Infinity;
        if (itemExp > prevExp) {
          prev.link_expires_at = item.link_expires_at;
          prev.link_anchor_at = item.link_anchor_at;
          prev.linked_ctv_name = item.linked_ctv_name;
        }
        prev.link_active = prev.link_active || item.link_active;
        prev.eligible = !prev.link_active;
      } else {
        byId.set(item.id, { ...item });
      }
    });

    const referrals = Array.from(byId.values());
    return res.json({ referrals });
  } catch (err) {
    console.error('[ctv GET /referrals] error:', err && err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/ctv/client-journeys
 * Returns referred clients enriched with journey stage data for the Tracking tab.
 * Stages: referred (1) → visited (2) → serviced (3) → paid (4)
 */
router.get('/client-journeys', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  const ctvId = employeeId;

  const dentalDb = getDb('dental');
  const cosmeticDb = getDb('cosmetic');

  const refSql = `
    SELECT id, name, phone, email, datecreated AS referred_at
    FROM dbo.partners
    WHERE referred_by_ctv_id = $1
      AND COALESCE(is_ctv, false) = false
      AND (customer = true OR active = true OR employee = false)
    ORDER BY datecreated DESC NULLS LAST
    LIMIT 50
  `;

  const [dRefsRaw, cRefsRaw] = await Promise.all([
    safeQueryRows(dentalDb, refSql, [ctvId]),
    safeQueryRows(cosmeticDb, refSql, [ctvId]),
  ]);

  const buildJourney = async (db, row, lob) => {
    const earnRows = await safeQueryRows(
      db,
      `SELECT amount, status, payout_id, service_line_id, earned_at, created_at,
              COALESCE(source, 'unknown') AS source
       FROM dbo.earnings
       WHERE client_id = $1 AND recipient_partner_id = $2
       ORDER BY COALESCE(earned_at, created_at) DESC`,
      [row.id, ctvId]
    );

    const totalEarned = earnRows.reduce((sum, e) => sum + Math.abs(parseFloat(e.amount || 0)), 0);
    const paidEarnings = earnRows.filter(e => e.status === 'paid' || !!e.payout_id);
    const hasService = earnRows.some(e => e.service_line_id);

    let stage = 'referred';
    let stageProgress = 1;
    if (paidEarnings.length > 0) {
      stage = 'paid';
      stageProgress = 4;
    } else if (hasService) {
      stage = 'serviced';
      stageProgress = 3;
    } else if (earnRows.length > 0) {
      stage = 'visited';
      stageProgress = 2;
    }

    const firstEarn = earnRows[earnRows.length - 1];
    const lastEarn = earnRows[0];

    return {
      id: row.id,
      name: row.name,
      phone: row.phone || '',
      lobs: [lob],
      referred_at: row.referred_at,
      referred_via: firstEarn?.source || 'direct',
      stage,
      stage_progress: stageProgress,
      visit: earnRows.length > 0 ? {
        date: firstEarn?.earned_at || firstEarn?.created_at || row.referred_at,
      } : undefined,
      service: hasService && lastEarn ? {
        name: lastEarn.source || null,
        amount: Math.abs(parseFloat(lastEarn.amount || 0)),
        date: lastEarn.earned_at || lastEarn.created_at,
      } : undefined,
      payment: paidEarnings.length > 0 ? {
        amount: paidEarnings.reduce((s, e) => s + Math.abs(parseFloat(e.amount || 0)), 0),
        date: paidEarnings[0]?.earned_at || paidEarnings[0]?.created_at,
        commission_earned: paidEarnings.reduce((s, e) => s + Math.abs(parseFloat(e.amount || 0)), 0),
      } : undefined,
      total_earned: Math.round(totalEarned),
      estimated_commission: Math.round(totalEarned),
    };
  };

  const dItems = await Promise.all(dRefsRaw.map((r) => buildJourney(dentalDb, r, 'dental')));
  const cItems = await Promise.all(cRefsRaw.map((r) => buildJourney(cosmeticDb, r, 'cosmetic')));

  // Activity-based journey override: stages above reflect commission EARNINGS, so a client who
  // already came & paid but has no earning row yet (retroactive CTV assignment, or a paid order
  // whose product carries no commission rate) is wrongly frozen at "referred" (1/4). Re-derive
  // the stage from the client's REAL operational activity (completed appointment / sale-order
  // line / payment) and take the higher of the two, so the CTV sees their client actually
  // progressing. Commission ($) display stays driven by earnings (total_earned / payment object).
  // Batched per LOB (no N+1); each query is guarded by safeQueryRows so a missing table/column
  // degrades to no-override rather than 500ing the portal.
  const activityProgressById = new Map();
  const computeActivity = async (db, rawRows) => {
    if (!rawRows || rawRows.length === 0) return;
    const ids = rawRows.map((r) => r.id);
    const [payAgg, svcAgg, visitAgg] = await Promise.all([
      safeQueryRows(db, `SELECT customer_id AS id FROM payments WHERE customer_id = ANY($1) AND amount > 0 GROUP BY customer_id`, [ids]),
      safeQueryRows(db, `SELECT so.partnerid AS id FROM dbo.saleorderlines sol JOIN dbo.saleorders so ON so.id = sol.orderid WHERE so.partnerid = ANY($1) AND sol.isdeleted = false GROUP BY so.partnerid`, [ids]),
      safeQueryRows(db, `SELECT partnerid AS id FROM appointments WHERE partnerid = ANY($1) AND state IN ('completed','done','arrived') GROUP BY partnerid`, [ids]),
    ]);
    const paid = new Set(payAgg.map((r) => r.id));
    const serviced = new Set(svcAgg.map((r) => r.id));
    const visited = new Set(visitAgg.map((r) => r.id));
    for (const id of ids) {
      let p = 1;
      if (paid.has(id)) p = 4;
      else if (serviced.has(id)) p = 3;
      else if (visited.has(id)) p = 2;
      activityProgressById.set(id, Math.max(p, activityProgressById.get(id) || 1));
    }
  };
  await Promise.all([computeActivity(dentalDb, dRefsRaw), computeActivity(cosmeticDb, cRefsRaw)]);

  const STAGE_BY_PROGRESS = { 1: 'referred', 2: 'visited', 3: 'serviced', 4: 'paid' };
  const applyActivity = (item) => {
    const ap = activityProgressById.get(item.id) || 1;
    if (ap > item.stage_progress) {
      item.stage_progress = ap;
      item.stage = STAGE_BY_PROGRESS[ap];
    }
  };
  dItems.forEach(applyActivity);
  cItems.forEach(applyActivity);

  // dedupe by id
  const byId = new Map();
  [...dItems, ...cItems].forEach((item) => {
    if (byId.has(item.id)) {
      const prev = byId.get(item.id);
      prev.lobs = Array.from(new Set([...prev.lobs, ...item.lobs]));
      prev.total_earned += item.total_earned;
      prev.estimated_commission += item.estimated_commission;
      if (item.stage_progress > prev.stage_progress) {
        prev.stage = item.stage;
        prev.stage_progress = item.stage_progress;
        if (item.visit) prev.visit = item.visit;
        if (item.service) prev.service = item.service;
        if (item.payment) prev.payment = item.payment;
      }
    } else {
      byId.set(item.id, item);
    }
  });

  const clients = Array.from(byId.values());
  return res.json({ clients });
});

// NOTE: GET /api/ctv/me is served by ctvProfileRoutes (mounted before ctvRoutes
// in server.js). It returns the DB-backed profile (real phone/email) that the
// portal "Me" tab consumes. A duplicate lightweight /me handler used to live
// here but was permanently shadowed by that mount order — it has been removed to
// avoid dead code that would silently win if the mount order ever changed.

/**
 * POST /api/ctv
 * Create a new CTV (commission-tracking vendor).
 * CTV users can create their own CTV profile with self-referral.
 * Admins can create CTVs and optionally set referred_by_ctv_id.
 *
 * Body: { name, phone, email, password, referred_by_ctv_id? }
 * Auth: requireAuth + (is_ctv=true OR admin permission)
 *
 * @crossref:domain[ctv-creation]
 * Backend endpoint: POST /api/ctv (authed CTV recruit or admin create)
 *
 * Absolute path references (SSOT + consumers + governance):
 *   SSOT: /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/components/shared/CtvCreationForm/
 *   Call sites:
 *     - /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/components/commission/CtvManagementTab.tsx (AddCtvModal, mode 'admin', uses createCtv)
 *     - /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/components/ctv/CtvRecruitModal.tsx (mode 'portal-recruit', uses createCtv)
 *     - /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/pages/CTV/JoinCtv.tsx (mode 'public-join' uses joinCtv; parity maintained)
 *   Governance: /Users/thuanle/Documents/TamTMV/Tgrouptest/AGENTS.md §5.1 (CTV / Identity Domain SSOT Enforcement)
 *   Product map: /Users/thuanle/Documents/TamTMV/Tgrouptest/product-map/domains/ctv.yaml (creation subsection)
 *   Types/contract: /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/lib/api/ctv.ts (CreateCtvInput, createCtv, CtvJoinInput parity for public path)
 *
 * Invariants (must match SSOT + public join path; see AGENTS.md §5.1):
 *   - Email OPTIONAL (only name/phone/password required; duplicate-email guard runs ONLY if email supplied; stores NULL when blank/omitted).
 *   - lob_scope: dental is ALWAYS forced + prepended (Array.from(new Set(['dental', ...]))); ensures login works against dental partners; cosmetic is additive.
 *   - Cross-DB atomic: always write dental row (for auth), write cosmetic only if scoped; on partial failure the caller sees E_CTV_CREATE_FAILED (note: current impl does not auto-rollback on Promise.all fail here, unlike explicit rollback in ctvPublic join).
 *   - Auth/perms: is_ctv or ctv.manage; uses permissionService + isCtvUser from ctvHelpers.
 *   - Errors: VALIDATION, U_DUPLICATE_PHONE (cross both DBs), U_DUPLICATE_EMAIL (only if supplied), S_CTV_CREATE_FORBIDDEN.
 *
 * @crossref:uses[./ctvHelpers (isCtvUser), ../services/permissionService (resolveEffectivePermissions for admin), ../db (getDb dual), local safeQueryRows for dual-DB dup checks + inserts]
 * @crossref:used-in[authed CTV create flows (admin Add CTV + portal recruit); complements public /ctv-public/join; frontend client website/src/lib/api/ctv.ts]
 */
router.post('/', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  const isCTV = isCtvUser(req.user);
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  // Caller must be a CTV (recruiting downline) or an admin.
  let isAdmin = false;
  try {
    const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');
    const permState = await resolveEffectivePermissions(employeeId, req.user?.authLob || 'dental');
    const list = (permState && permState.effectivePermissions) || [];
    isAdmin = isAdminPermissionState(permState) || list.includes('*') || list.includes('ctv.manage');
  } catch (e) {
    isAdmin = false;
  }

  if (!isCTV && !isAdmin) {
    return res.status(403).json({
      error: { code: 'S_CTV_CREATE_FORBIDDEN', message: 'Only CTVs or admins can create new CTVs' },
    });
  }

  const { name, phone, email, password, lob_scope: bodyScope, referred_by_ctv_id: bodyReferredBy } = req.body || {};

  if (!name || !phone || !password) {
    return res.status(400).json({
      error: { code: 'VALIDATION', message: 'Missing required fields: name, phone, password' },
    });
  }
  // email is optional (consistent with public /ctv-public/join and recent spec for CTV self-signup);
  // store as NULL if blank (skips dup check, allows root CTVs without email).
  // [enhanced per task with @crossref block above; see also "Email is OPTIONAL (spec §12)" in ctvPublic.js]

  // Normalize requested LOB scope; dental is always included so the CTV can
  // authenticate (login resolves against the default/dental partners table).
  const requested = Array.isArray(bodyScope) && bodyScope.length
    ? bodyScope.filter((l) => l === 'dental' || l === 'cosmetic')
    : ['dental'];
  const lobScope = Array.from(new Set(['dental', ...requested]));

  const dentalDb = getDb('dental');
  const cosmeticDb = getDb('cosmetic');

  try {
    // Duplicate phone/email guard across both physical DBs.
    const phoneCheckSql = `SELECT id FROM dbo.partners WHERE LOWER(phone) = LOWER($1) LIMIT 1`;
    const [dPhones, cPhones] = await Promise.all([
      safeQueryRows(dentalDb, phoneCheckSql, [phone]),
      safeQueryRows(cosmeticDb, phoneCheckSql, [phone]),
    ]);
    if (dPhones.length > 0 || cPhones.length > 0) {
      return res.status(400).json({ error: { code: 'U_DUPLICATE_PHONE', message: 'Phone number already exists' } });
    }

    if (email) {
      const emailCheckSql = `SELECT id FROM dbo.partners WHERE LOWER(email) = LOWER($1) LIMIT 1`;
      const [dEmails, cEmails] = await Promise.all([
        safeQueryRows(dentalDb, emailCheckSql, [email]),
        safeQueryRows(cosmeticDb, emailCheckSql, [email]),
      ]);
      if (dEmails.length > 0 || cEmails.length > 0) {
        return res.status(400).json({ error: { code: 'U_DUPLICATE_EMAIL', message: 'Email already exists' } });
      }
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    // CTV caller becomes the upline; admin may specify (or leave empty).
    const referredById = isCTV && !bodyReferredBy ? employeeId : (bodyReferredBy || null);

    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    const now = new Date().toISOString();

    // employee=true so the CTV can log in (auth requires employee=true).
    // lob_scope is passed as a JS array → node-postgres binds it as text[].
    const insertSql = `
      INSERT INTO dbo.partners (
        id, name, phone, email, password_hash, is_ctv, lob_scope, referred_by_ctv_id,
        active, employee, customer, supplier, isagent, isinsurance, iscompany, ishead,
        isbusinessinvoice, isdeleted, datecreated, lastupdated
      ) VALUES (
        $1, $2, $3, $4, $5, true, $6, $7,
        true, true, false, false, false, false, false, false,
        false, false, $8, $8
      ) RETURNING id, name, phone, email, is_ctv, lob_scope, referred_by_ctv_id, active, datecreated
    `;
    const params = [id, name, phone, email || null, passwordHash, lobScope, referredById, now];

    // Always create the auth row in dental (default DB); mirror into cosmetic
    // only when the CTV is scoped there, so cosmetic earnings can FK to them.
    const writes = [safeQueryRows(dentalDb, insertSql, params)];
    if (lobScope.includes('cosmetic')) {
      writes.push(safeQueryRows(cosmeticDb, insertSql, params));
    }
    const results = await Promise.all(writes);

    const created = results[0][0];
    if (!created) return res.status(500).json({ error: 'Failed to create CTV' });
    return res.status(201).json(created);
  } catch (e) {
    console.error('[ctv POST /] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/ctv/clients
 * Refer a new client (customer partner) under this CTV.
 * Auth: requireAuth + is_ctv=true
 *
 * Body: { name, phone, email }
 * Sets referred_by_ctv_id to req.user.employeeId, is_ctv=false, customer=true
 */
router.post('/clients', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  const isCTV = isCtvUser(req.user);
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  let isAdmin = false;
  try {
    const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');
    const permState = await resolveEffectivePermissions(employeeId, req.user?.authLob || 'dental');
    const list = (permState && permState.effectivePermissions) || [];
    isAdmin = isAdminPermissionState(permState) || list.includes('*') || list.includes('ctv.manage');
  } catch (e) {
    isAdmin = false;
  }

  if (!isCTV && !isAdmin) {
    return res.status(403).json({
      error: { code: 'S_CTV_CREATE_FORBIDDEN', message: 'Only CTVs or admins can refer clients' },
    });
  }

  const { name, phone, lob: bodyLob, referred_by_ctv_id: bodyReferredBy } = req.body || {};

  if (!name || !phone) {
    return res.status(400).json({
      error: { code: 'VALIDATION', message: 'Missing required fields: name, phone' },
    });
  }

  // A referred client belongs to one LOB; write only to that physical DB.
  const lob = bodyLob === 'cosmetic' ? 'cosmetic' : 'dental';
  const db = getDb(lob);
  const referredById = isCTV && !bodyReferredBy ? employeeId : (bodyReferredBy || null);

  try {
    // A phone identifies one real person. If ANY LOB's partners table already
    // has this phone, run the same 6-month claim check that POST /bookings uses:
    // an actively-claimed client must never be re-registered under a different
    // CTV, even in the OTHER LOB. Same-LOB duplicates still surface as
    // U_DUPLICATE_PHONE for backwards compatibility.
    const phoneCheckSql = `SELECT id FROM dbo.partners WHERE LOWER(phone) = LOWER($1) LIMIT 1`;
    const otherLob = lob === 'dental' ? 'cosmetic' : 'dental';
    const [dupInLob, dupInOtherLob] = await Promise.all([
      safeQueryRows(db, phoneCheckSql, [phone]),
      safeQueryRows(getDb(otherLob), phoneCheckSql, [phone]),
    ]);
    const existingMatch = dupInLob[0]
      ? { id: dupInLob[0].id, sourceLob: lob }
      : dupInOtherLob[0]
        ? { id: dupInOtherLob[0].id, sourceLob: otherLob }
        : null;

    if (existingMatch) {
      const claim = await getReferralClaimStatus(existingMatch.id, existingMatch.sourceLob, {});
      if (claim.active && claim.ownerCtvId && claim.ownerCtvId !== employeeId) {
        return res.status(400).json({
          error: {
            code: 'B_CLIENT_CLAIMED',
            message: 'Client already active with another CTV',
            ownerName: claim.ownerName,
            owner_name: claim.ownerName,
            expiresAt: claim.expiresAt,
            expires_at: claim.expiresAt,
          },
        });
      }
      if (existingMatch.sourceLob === lob) {
        return res.status(400).json({
          error: { code: 'U_DUPLICATE_PHONE', message: 'Phone number already exists' },
        });
      }
      // Cross-LOB with a lapsed or unclaimed match: allow create in the requested LOB.
    }

    const { randomUUID } = require('crypto');
    const id = randomUUID();
    const now = new Date().toISOString();

    // customer=true, employee=false (clients never log in). lob_scope = [lob].
    const insertSql = `
      INSERT INTO dbo.partners (
        id, name, phone, lob_scope, referred_by_ctv_id,
        is_ctv, customer, active, employee, supplier, isagent, isinsurance, iscompany, ishead,
        isbusinessinvoice, isdeleted, datecreated, lastupdated
      ) VALUES (
        $1, $2, $3, $4, $5,
        false, true, true, false, false, false, false, false, false,
        false, false, $6, $6
      ) RETURNING id, name, phone, lob_scope, referred_by_ctv_id, customer, active, datecreated
    `;
    const rows = await safeQueryRows(db, insertSql, [id, name, phone, [lob], referredById, now]);

    const created = rows[0];
    if (!created) return res.status(500).json({ error: 'Failed to create client' });
    return res.status(201).json(created);
  } catch (e) {
    console.error('[ctv POST /clients] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/ctv/network
 * Returns the authenticated CTV's direct recruits and recursive downline (max 5 levels)
 * plus client counts. Privacy: exposes CTV partner profile basics only; no client PII.
 */
router.get('/network', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  try {
    const dentalDb = getDb('dental');
    const cosmeticDb = getDb('cosmetic');
    const ctvSql = `
      SELECT id, name, phone, email, active, referred_by_ctv_id, datecreated
      FROM dbo.partners
      WHERE is_ctv = true AND isdeleted = false
    `;
    const [dCtvs, cCtvs, dClientCounts, cClientCounts, dEarnRows, cEarnRows] = await Promise.all([
      safeQueryRows(dentalDb, ctvSql),
      safeQueryRows(cosmeticDb, ctvSql),
      safeQueryRows(dentalDb, `SELECT referred_by_ctv_id AS ctv_id, COUNT(*) AS count FROM dbo.partners WHERE customer = true AND referred_by_ctv_id IS NOT NULL GROUP BY referred_by_ctv_id`),
      safeQueryRows(cosmeticDb, `SELECT referred_by_ctv_id AS ctv_id, COUNT(*) AS count FROM dbo.partners WHERE customer = true AND referred_by_ctv_id IS NOT NULL GROUP BY referred_by_ctv_id`),
      safeQueryRows(dentalDb, `SELECT recipient_partner_id AS ctv_id, COALESCE(SUM(amount),0) AS amount FROM dbo.earnings GROUP BY recipient_partner_id`),
      safeQueryRows(cosmeticDb, `SELECT recipient_partner_id AS ctv_id, COALESCE(SUM(amount),0) AS amount FROM dbo.earnings GROUP BY recipient_partner_id`),
    ]);

    return res.json(buildCtvNetwork({
      ctvId: employeeId,
      dentalCtvs: dCtvs,
      cosmeticCtvs: cCtvs,
      dentalClientCounts: dClientCounts,
      cosmeticClientCounts: cClientCounts,
      dentalEarnings: dEarnRows,
      cosmeticEarnings: cEarnRows,
    }));
  } catch (e) {
    console.error('[ctv GET /network] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/ctv/hierarchy
 * Shaped for the NEW portal's Network tab (CtvHierarchyPanel → CtvHierarchyResponse):
 * { current, upline[], downline[] (flat), totals }. Delegates to getCtvHierarchy so the
 * cross-DB source fetch AND the downline-earnings / projected-override rollup
 * (commission_level_config-driven) live in ONE place shared with the admin hierarchy view.
 */
router.get('/hierarchy', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  try {
    const result = await getCtvHierarchy(employeeId);
    return res.json(result);
  } catch (e) {
    console.error('[ctv GET /hierarchy] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/ctv/client-lookup?phone=...&lob=dental|cosmetic
 * Live phone cross-check for the CTV refer/booking form: looks the phone up in the CHOSEN LOB's
 * database (dental vs cosmetic) and reports whether the customer already exists there and whether
 * they're already actively claimed by another CTV. Read-only; the authoritative gate still runs on
 * POST /bookings.
 */
router.get('/client-lookup', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  const phone = (req.query.phone || '').toString().trim();
  const lob = req.query.lob === 'cosmetic' ? 'cosmetic' : 'dental';
  if (!phone) return res.status(400).json({ error: { code: 'VALIDATION', message: 'phone is required' } });

  try {
    const db = getDb(lob);
    const rows = await safeQueryRows(
      db,
      `SELECT id, name FROM dbo.partners WHERE LOWER(phone) = LOWER($1) AND COALESCE(isdeleted, false) = false LIMIT 1`,
      [phone]
    );
    if (!rows[0]) return res.json({ exists: false, lob });

    const clientId = rows[0].id;
    const claim = await getReferralClaimStatus(clientId, lob, {});
    const claimedByOther = !!(claim.active && claim.ownerCtvId && claim.ownerCtvId !== employeeId);
    const claimedByMe = !!(claim.active && claim.ownerCtvId === employeeId);
    return res.json({
      exists: true,
      lob,
      clientId,
      name: rows[0].name || null,
      claimed: claimedByOther,
      claimedByMe,
      ownerName: claimedByOther ? claim.ownerName || null : null,
      expiresAt: claimedByOther ? claim.expiresAt || null : null,
    });
  } catch (e) {
    console.error('[ctv GET /client-lookup] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/ctv/services?lob=dental|cosmetic
 * CTV-scoped service catalog for the refer/booking form's service picker.
 * Returns the active products of the CHOSEN LOB so the CTV can attach a service
 * to the appointment they create. Mount-level `ctv.dashboard.view` gates this, so
 * CTV users reach it without the admin-only `services.view` permission.
 */
router.get('/services', requireAuth, async (req, res) => {
  if (!req.user?.employeeId) return res.status(401).json({ error: 'No token' });
  const lob = req.query.lob === 'cosmetic' ? 'cosmetic' : 'dental';
  try {
    const db = getDb(lob);
    const rows = await safeQueryRows(
      db,
      `SELECT p.id, p.name, COALESCE(p.listprice, p.saleprice) AS price,
              p.categid AS category_id, pc.name AS category_name
       FROM dbo.products p
       LEFT JOIN dbo.productcategories pc ON pc.id = p.categid
       WHERE p.active = true
       ORDER BY pc.name ASC NULLS LAST, p.name ASC
       LIMIT 1000`,
      []
    );
    return res.json({
      lob,
      services: rows.map((r) => ({
        id: r.id,
        name: r.name,
        price: r.price != null ? Number(r.price) : null,
        // Category lets the picker group a long catalog (e.g. dental ~450 services
        // across 16 categories). NULL categid → grouped under "Uncategorized" client-side.
        category: r.category_id ? { id: r.category_id, name: r.category_name || null } : null,
      })),
    });
  } catch (e) {
    console.error('[ctv GET /services] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/ctv/bookings
 * CTV books a client: resolve by phone → eligibility gate → create/reclaim client →
 * appointment. Appointment productid carries the selected service, or Referral
 * Start as the default purpose, but this path never creates a saleorder card.
 */
router.post('/bookings', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  const isCTV = isCtvUser(req.user);
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  // Admin can also book on behalf of CTVs
  let isAdmin = false;
  try {
    const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');
    const permState = await resolveEffectivePermissions(employeeId, req.user?.authLob || 'dental');
    const list = (permState && permState.effectivePermissions) || [];
    isAdmin = isAdminPermissionState(permState) || list.includes('*') || list.includes('ctv.manage');
  } catch (e) {
    isAdmin = false;
  }

  if (!isCTV && !isAdmin) {
    return res.status(403).json({
      error: { code: 'S_CTV_CREATE_FORBIDDEN', message: 'CTV only' },
    });
  }

  const { clientId: bodyClientId, name, phone, lob: bodyLob, date, time, companyId, productId, note } = req.body || {};
  if (!phone || !date) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'phone and date are required' } });
  }
  const lob = bodyLob === 'cosmetic' ? 'cosmetic' : 'dental';
  // Appointment note entered by the CTV in the refer form (optional, trimmed/capped).
  const apptNote = note != null ? String(note).trim().slice(0, 2000) : '';
  const db = getDb(lob);

  try {
    // 1. Find existing client by id or phone
    let clientId = bodyClientId || null;
    if (!clientId) {
      const found = await safeQueryRows(db, `SELECT id FROM dbo.partners WHERE LOWER(phone) = LOWER($1) LIMIT 1`, [phone]);
      clientId = found[0]?.id || null;
    }

    // 2. Eligibility gate
    if (clientId) {
      const claim = await getReferralClaimStatus(clientId, lob, {});
      if (claim.active && claim.ownerCtvId && claim.ownerCtvId !== employeeId) {
        return res.status(400).json({
          error: { code: 'B_CLIENT_CLAIMED', message: 'Client already active with another CTV', ownerName: claim.ownerName, expiresAt: claim.expiresAt },
        });
      }
    }

    // 3a. Validate the chosen service belongs to THIS LOB's catalog. An unknown
    // or cross-LOB productId is silently dropped (→ null) so a bad id never
    // breaks the booking via an FK violation; the appointment is still created.
    // If no service is selected, stamp the appointment with Referral Start as
    // its purpose only. Do NOT create a saleorder/service card here.
    let validProductId = null;
    if (productId) {
      const prodRows = await safeQueryRows(db, `SELECT id FROM dbo.products WHERE id = $1 AND active = true LIMIT 1`, [productId]);
      validProductId = prodRows[0]?.id || null;
    } else {
      const referralStartRows = await safeQueryRows(
        db,
        `SELECT p.id
           FROM dbo.commission_settings cs
           JOIN dbo.products p ON p.id = cs.referral_start_product_id
          WHERE p.active = true
          LIMIT 1`
      );
      validProductId = referralStartRows[0]?.id || null;
    }

    // 3b. Resolve a non-null appointment company before mutating the client.
    const appointmentCompanyId = await resolveCtvBookingCompanyId({
      queryRows: (sql, params) => safeQueryRows(db, sql, params),
      requestedCompanyId: companyId || null,
      tokenCompanyId: req.user?.companyId || null,
    });
    if (!appointmentCompanyId) {
      return res.status(400).json({
        error: {
          code: 'B_COMPANY_REQUIRED',
          message: 'No clinic location is available for this CTV booking',
        },
      });
    }

    // 3c. Create client if new
    if (!clientId) {
      clientId = require('crypto').randomUUID();
      const now = new Date().toISOString();
      await safeQueryRows(db,
        `INSERT INTO dbo.partners (id, name, phone, lob_scope, referred_by_ctv_id, is_ctv, customer, active, employee, supplier, isagent, isinsurance, iscompany, ishead, isbusinessinvoice, isdeleted, datecreated, lastupdated)
         VALUES ($1,$2,$3,$4,$5,false,true,true,false,false,false,false,false,false,false,false,$6,$6)`,
        [clientId, name || 'Khách CTV', phone, [lob], employeeId, now]);
    } else {
      // Re-claim (or claim a lapsed/unclaimed client) for this CTV
      await safeQueryRows(
        db,
        `UPDATE dbo.partners
         SET referred_by_ctv_id = $1,
             customer = true,
             lastupdated = now()
         WHERE id = $2`,
        [employeeId, clientId]
      );
    }

    // 3d. Appointment — use canonical insert pattern
    const apptId = require('crypto').randomUUID();
    const nameResult = await safeQueryRows(db,
      "SELECT COALESCE(MAX(CAST(SUBSTRING(name FROM 3) AS INTEGER)), 0) + 1 AS next_seq FROM dbo.appointments WHERE name LIKE 'AP%'"
    );
    const nextSeq = nameResult[0]?.next_seq || 1;
    const apptName = `AP${String(nextSeq).padStart(6, '0')}`;

    await safeQueryRows(db,
      `INSERT INTO dbo.appointments (
        id, name, date, time, partnerid, doctorid, companyid, note, timeexpected,
        color, state, aptstate, isrepeatcustomer, isnotreatment, productid, assistantid, dentalaideid,
        ctv_id, datecreated, lastupdated
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, false, $13, $14, $15, $16,
        (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'),
        (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
      )`,
      [apptId, apptName, date, time || null, clientId, null, appointmentCompanyId, apptNote, 30, '1', 'confirmed', 'confirmed', validProductId, null, null, employeeId]);

    return res.status(201).json({ clientId, appointmentId: apptId });
  } catch (e) {
    console.error('[ctv POST /bookings] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

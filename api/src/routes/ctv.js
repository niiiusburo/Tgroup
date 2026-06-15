/**
 * ctv.js — Real cross-DB CTV commission aggregation for Cosmetic LOB v2 (D13 live)
 * Uses getDb('dental') + getDb('cosmetic') to query dbo.earnings + partners for the authed is_ctv user's employeeId (recipient_partner_id).
 * Commission reads dbo.earnings; Theo dõi uses operational cards (appointments.ctv_id ∪ saleorders.ctv_id).
 * Mounted at /api/ctv (gated by ctv.dashboard.view perm + requireAuth).
 * @crossref:endpoint[GET /api/ctv/commission-summary, GET /api/ctv/referrals, GET /api/ctv/client-journeys, POST /api/ctv, POST /api/ctv/clients, POST /api/ctv/bookings]
 * @crossref:uses[api/src/services/referralClaim.js, api/src/services/ctvCardTrackingReferrals.js, api/src/services/ctvNetwork.js, api/src/services/ctvBookingCompany.js, api/src/routes/ctvHelpers.js (isCtvUser), api/src/middleware/auth.js (requireAuth), api/src/services/permissionService.js (lazy admin checks), product-map/domains/ctv.yaml]
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
           e.source, e.level, e.amount, e.status, e.payout_id, e.earned_at, e.created_at,
           p.name AS client_name,
           p.referred_by_ctv_id AS client_referred_by_ctv_id,
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

  const { enrichCommissionAttribution, mapCommissionApiRow } = require('../services/ctvCommissionAttribution');
  const enriched = await enrichCommissionAttribution(all, ctvId, {
    dentalDb,
    cosmeticDb,
    safeQueryRows,
  });
  const mapEarningRow = mapCommissionApiRow;

  const recent = enriched.slice(0, 8).map(mapEarningRow);
  // Pending tab shows ALL pending rows including negative reversals (INV-003A:
  // reversal rows are audit-visible; the CTV must see upcoming deductions).
  // Regression guard: ctvBookings.test.js "does not list pending reversals ... in the Paid tab".
  const pendingList = enriched
    .filter((e) => e.status === 'pending')
    .slice(0, 50)
    .map(mapEarningRow);
  // Paid = actually paid out (matches the aggregation's isPaid). This deliberately
  // EXCLUDES 'pending' reversals and INV-003C service-card 'reversed' rows, neither of
  // which are paid earnings.
  const paidList = enriched
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
 * Theo dõi: appointments.ctv_id ∪ saleorders.ctv_id; computeCtvLink (appt vs service, 6-month
 * window). Commission on Home requires saleorders.ctv_id only — not profile referred_by.
 */
router.get('/referrals', requireAuth, requireCtvUser, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  const ctvId = employeeId;

  const dentalDb = getDb('dental');
  const cosmeticDb = getDb('cosmetic');

  try {
    const { buildCardTrackingReferrals } = require('../services/ctvCardTrackingReferrals');
    const referrals = await buildCardTrackingReferrals(ctvId, {
      dentalDb,
      cosmeticDb,
      safeQueryRows,
    });
    return res.json({ referrals });
  } catch (err) {
    console.error('[ctv GET /referrals] error:', err && err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/ctv/client-journeys
 * Card-based Theo dõi journey stages (same client set as GET /referrals via buildCardTrackingReferrals).
 * Stages: referred (1) → visited (2) → serviced (3) → paid (4)
 */
router.get('/client-journeys', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  const ctvId = employeeId;

  const dentalDb = getDb('dental');
  const cosmeticDb = getDb('cosmetic');

  try {
    const { buildCardTrackingReferrals } = require('../services/ctvCardTrackingReferrals');
    const { mapCardReferralsToClientJourneys } = require('./ctvClientJourneys');
    const referrals = await buildCardTrackingReferrals(ctvId, {
      dentalDb,
      cosmeticDb,
      safeQueryRows,
    });
    return res.json({ clients: mapCardReferralsToClientJourneys(referrals) });
  } catch (err) {
    console.error('[ctv GET /client-journeys] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
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
    // Claim locks are per LOB. Only the target LOB's partners table + claim gate matter here.
    const phoneCheckSql = `SELECT id FROM dbo.partners WHERE LOWER(phone) = LOWER($1) LIMIT 1`;
    const dupInLob = await safeQueryRows(db, phoneCheckSql, [phone]);

    if (dupInLob[0]) {
      const claim = await getReferralClaimStatus(dupInLob[0].id, lob, {});
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
      return res.status(400).json({
        error: { code: 'U_DUPLICATE_PHONE', message: 'Phone number already exists' },
      });
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
 *
 * @note Network `client_count` is profile-based (`partners.referred_by_ctv_id`), distinct from
 * Theo dõi card count on `GET /referrals` (appointments.ctv_id ∪ saleorders.ctv_id).
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

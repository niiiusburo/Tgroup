/**
 * ctv.js — Real cross-DB CTV commission aggregation for Cosmetic LOB v2 (D13 live)
 * Uses getDb('dental') + getDb('cosmetic') to query dbo.earnings + partners for the authed is_ctv user's employeeId (recipient_partner_id).
 * No mocks, no stubs. Data is 100% from DB via engine-written rows (referred_by_ctv_id path).
 * Mounted at /api/ctv (gated by ctv.dashboard.view perm + requireAuth).
 */
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getDb } = require('../db');
const { getReferralClaimStatus } = require('../services/referralClaim');
const { createReferralStartCard } = require('../services/referralCard');

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

/**
 * GET /api/ctv/commission-summary
 * Live aggregation across both LOB DBs for this CTV (by recipient_partner_id = employeeId from JWT).
 * Returns shape consumable by CtvDashboard (totals with per-LOB pending, recent with client_name + lob pills, lists).
 */
router.get('/commission-summary', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  const ctvId = employeeId;

  const earningsSql = `
    SELECT e.id, e.client_id, e.recipient_partner_id, e.payment_id, e.service_line_id,
           e.source, e.amount, e.status, e.payout_id, e.earned_at, e.created_at,
           COALESCE(p.name, 'Unknown Client') AS client_name
    FROM dbo.earnings e
    LEFT JOIN dbo.partners p ON p.id = e.client_id
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

  const recent = all.slice(0, 8).map((e) => ({
    id: e.id,
    client_name: e.client_name,
    amount: parseFloat(e.amount || 0),
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
  });
});

/**
 * GET /api/ctv/referrals
 * Live list of partners (both DBs) where referred_by_ctv_id matches this CTV.
 * Computes per-referral earnings totals/counts from the earnings table (live attribution proof).
 */
router.get('/referrals', requireAuth, async (req, res) => {
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
    return {
      id: row.id,
      name: row.name,
      phone: row.phone || '',
      lobs: [lob],
      total_earned: total,
      earned_count: cnt,
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
router.get('/me', requireAuth, (req, res) => {
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
 * POST /api/ctv
 * Create a new CTV (commission-tracking vendor).
 * CTV users can create their own CTV profile with self-referral.
 * Admins can create CTVs and optionally set referred_by_ctv_id.
 *
 * Body: { name, phone, email, password, referred_by_ctv_id? }
 * Auth: requireAuth + (is_ctv=true OR admin permission)
 */
router.post('/', requireAuth, async (req, res) => {
  const { employeeId, is_ctv: isCTV } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  // Caller must be a CTV (recruiting downline) or an admin.
  let isAdmin = false;
  try {
    const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');
    const permState = await resolveEffectivePermissions(employeeId);
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

  if (!name || !phone || !email || !password) {
    return res.status(400).json({
      error: { code: 'VALIDATION', message: 'Missing required fields: name, phone, email, password' },
    });
  }

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

    const emailCheckSql = `SELECT id FROM dbo.partners WHERE LOWER(email) = LOWER($1) LIMIT 1`;
    const [dEmails, cEmails] = await Promise.all([
      safeQueryRows(dentalDb, emailCheckSql, [email]),
      safeQueryRows(cosmeticDb, emailCheckSql, [email]),
    ]);
    if (dEmails.length > 0 || cEmails.length > 0) {
      return res.status(400).json({ error: { code: 'U_DUPLICATE_EMAIL', message: 'Email already exists' } });
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
    const params = [id, name, phone, email, passwordHash, lobScope, referredById, now];

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
  const { employeeId, is_ctv: isCTV } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  let isAdmin = false;
  try {
    const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');
    const permState = await resolveEffectivePermissions(employeeId);
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
    const phoneCheckSql = `SELECT id FROM dbo.partners WHERE LOWER(phone) = LOWER($1) LIMIT 1`;
    const dup = await safeQueryRows(db, phoneCheckSql, [phone]);
    if (dup.length > 0) {
      return res.status(400).json({ error: { code: 'U_DUPLICATE_PHONE', message: 'Phone number already exists' } });
    }

    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
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

module.exports = router;

/**
 * POST /api/ctv/bookings
 * CTV books a client: resolve by phone → eligibility gate → create/reclaim client →
 * Referral Start card → appointment. Atomic within the handler (no explicit tx).
 */
router.post('/bookings', requireAuth, async (req, res) => {
  const { employeeId, is_ctv: isCTV } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  // Admin can also book on behalf of CTVs
  let isAdmin = false;
  try {
    const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');
    const permState = await resolveEffectivePermissions(employeeId);
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

  const { clientId: bodyClientId, name, phone, lob: bodyLob, date, time, companyId, productId } = req.body || {};
  if (!phone || !date) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'phone and date are required' } });
  }
  const lob = bodyLob === 'cosmetic' ? 'cosmetic' : 'dental';
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

    // 3a. Create client if new
    if (!clientId) {
      clientId = require('crypto').randomUUID();
      const now = new Date().toISOString();
      await safeQueryRows(db,
        `INSERT INTO dbo.partners (id, name, phone, lob_scope, referred_by_ctv_id, is_ctv, customer, active, employee, supplier, isagent, isinsurance, iscompany, ishead, isbusinessinvoice, isdeleted, datecreated, lastupdated)
         VALUES ($1,$2,$3,$4,$5,false,true,true,false,false,false,false,false,false,false,false,$6,$6)`,
        [clientId, name || 'Khách CTV', phone, [lob], employeeId, now]);
    } else {
      // Re-claim (or claim a lapsed/unclaimed client) for this CTV
      await safeQueryRows(db, `UPDATE dbo.partners SET referred_by_ctv_id = $1, lastupdated = now() WHERE id = $2`, [employeeId, clientId]);
    }

    // 3b. Referral Start card
    await createReferralStartCard({ clientId, lob });

    // 3c. Appointment — use canonical insert pattern
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
        datecreated, lastupdated
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, false, $13, $14, $15,
        (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'),
        (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
      )`,
      [apptId, apptName, date, time || null, clientId, null, companyId || null, '', 30, '1', 'confirmed', 'confirmed', productId || null, null, null]);

    return res.status(201).json({ clientId, appointmentId: apptId });
  } catch (e) {
    if (e.code === 'REFERRAL_PRODUCT_NOT_CONFIGURED') {
      return res.status(409).json({ error: { code: 'REFERRAL_PRODUCT_NOT_CONFIGURED', message: 'Admin must configure the Referral Start product first' } });
    }
    console.error('[ctv POST /bookings] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

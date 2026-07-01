/**
 * clients.js — client referral/lookup/creation routes.
 * Extracted from the original ctv.js (pure mechanical split; no logic/SQL changes).
 *
 * Routes mounted under /api/ctv (see ctv/index.js).
 *
 * @crossref:endpoint[GET /api/ctv/referrals, GET /api/ctv/client-journeys, POST /api/ctv/clients, GET /api/ctv/client-lookup, GET /api/ctv/services]
 * @crossref:domain[ctv]
 * @crossref:uses[api/src/db.js (getDb dual), api/src/services/referralClaim.js, api/src/services/ctvCardTrackingReferrals.js, api/src/routes/ctvClientJourneys.js, api/src/routes/ctv/_shared.js]
 */
const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { getDb } = require('../../db');
const { getReferralClaimStatus } = require('../../services/referralClaim');
const { isCtvUser } = require('../ctvHelpers');
const { safeQueryRows, requireCtvUser } = require('./_shared');

const router = express.Router();

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
    const { buildCardTrackingReferrals } = require('../../services/ctvCardTrackingReferrals');
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
    const { buildCardTrackingReferrals } = require('../../services/ctvCardTrackingReferrals');
    const { mapCardReferralsToClientJourneys } = require('../ctvClientJourneys');
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
    const { resolveEffectivePermissions, isAdminPermissionState } = require('../../services/permissionService');
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

module.exports = router;

/**
 * bookings.js — booking routes.
 * Extracted from the original ctv.js (pure mechanical split; no logic/SQL changes).
 *
 * Routes mounted under /api/ctv (see ctv/index.js).
 *
 * @crossref:endpoint[POST /api/ctv/bookings]
 * @crossref:domain[ctv]
 * @crossref:uses[api/src/db.js (getDb), api/src/services/referralClaim.js, api/src/services/ctvBookingCompany.js, api/src/services/permissionService.js, api/src/routes/ctvHelpers.js (isCtvUser), api/src/routes/ctv/_shared.js]
 */
const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { getDb } = require('../../db');
const { getReferralClaimStatus } = require('../../services/referralClaim');
const { resolveCtvBookingCompanyId } = require('../../services/ctvBookingCompany');
const { isCtvUser } = require('../ctvHelpers');
const { safeQueryRows } = require('./_shared');

const router = express.Router();

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
    const { resolveEffectivePermissions, isAdminPermissionState } = require('../../services/permissionService');
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

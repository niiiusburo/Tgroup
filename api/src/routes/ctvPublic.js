'use strict';

/**
 * ctvPublic.js — PUBLIC (unauthenticated) CTV landing flows.
 * Mounted at /api/ctv-public (NO auth). A shared link `CTV-XXXXXX`, or the
 * public join page's upline phone field, lets a new person register themselves
 * as a CTV under the sharer (referred_by_ctv_id = the sharer).
 *
 *   GET  /api/ctv-public/refcode/:code   -> { ok, uplineId, uplineName }   (resolve a link)
 *   GET  /api/ctv-public/ctv-lookup      -> { exists, name }   (resolve a CTV phone)
 *   POST /api/ctv-public/join            -> creates the CTV under the code/phone upline
 *
 * The referral code is `CTV-` + the first 6 hex of the upline's partners.id (see CtvMeTab).
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { getDb } = require('../db');
const { getReferralClaimStatus } = require('../services/referralClaim');

const router = express.Router();

async function safeRows(db, sql, params = []) {
  try {
    return await db.queryRows(sql, params);
  } catch (e) {
    console.error('[ctvPublic] query error:', e.message);
    return [];
  }
}

async function queryRows(db, sql, params = []) {
  return db.queryRows(sql, params);
}

function normalizePhone(value) {
  return value == null ? '' : String(value).trim();
}

function normalizeLob(value) {
  return value === 'cosmetic' ? 'cosmetic' : 'dental';
}

/** "CTV-79DFCE" -> "79dfce" (lowercased hex prefix), or null if malformed. */
function codeToPrefix(code) {
  if (!code || typeof code !== 'string') return null;
  const hex = code.replace(/^CTV-/i, '').trim().toLowerCase();
  return /^[0-9a-f]{4,12}$/.test(hex) ? hex : null;
}

/** Resolve a referral code to its upline CTV (dental row is authoritative — every CTV has one). */
async function resolveUpline(code) {
  const prefix = codeToPrefix(code);
  if (!prefix) return null;
  const rows = await safeRows(
    getDb('dental'),
    `SELECT id, name, lob_scope FROM dbo.partners
      WHERE is_ctv = true AND COALESCE(isdeleted,false) = false AND id::text LIKE $1
      ORDER BY datecreated ASC LIMIT 1`,
    [`${prefix}%`]
  );
  return rows[0] || null;
}

async function resolveCtvByPhone(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  const rows = await safeRows(
    getDb('dental'),
    `SELECT id, name, phone, lob_scope
       FROM dbo.partners
      WHERE is_ctv = true
        AND COALESCE(active, true) = true
        AND COALESCE(isdeleted, false) = false
        AND LOWER(phone) = LOWER($1)
      ORDER BY datecreated ASC NULLS LAST
      LIMIT 1`,
    [normalized]
  );
  return rows[0] || null;
}

// GET /api/ctv-public/client-lookup?phone=...&lob=dental|cosmetic&ctvPhone=...
// Public read-only phone check for the landing booking sheet. The optional CTV
// phone lets the response distinguish "claimed by this CTV" from "claimed by
// another CTV"; the POST gate below remains authoritative.
router.get('/client-lookup', async (req, res) => {
  const phone = normalizePhone(req.query.phone);
  const ctvPhone = normalizePhone(req.query.ctvPhone || req.query.ctv_phone);
  const lob = normalizeLob(req.query.lob);

  if (!phone) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'phone is required' } });
  }

  try {
    const ctv = ctvPhone ? await resolveCtvByPhone(ctvPhone) : null;
    const db = getDb(lob);
    const rows = await queryRows(
      db,
      `SELECT id, name
         FROM dbo.partners
        WHERE LOWER(phone) = LOWER($1)
          AND COALESCE(isdeleted, false) = false
        LIMIT 1`,
      [phone]
    );
    if (!rows[0]) return res.json({ exists: false, lob });

    const clientId = rows[0].id;
    const claim = await getReferralClaimStatus(clientId, lob, {});
    const claimedByMe = !!(ctv?.id && claim.active && claim.ownerCtvId === ctv.id);
    const claimedByOther = !!(claim.active && claim.ownerCtvId && (!ctv?.id || claim.ownerCtvId !== ctv.id));

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
    console.error('[ctvPublic GET /client-lookup] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ctv-public/services?lob=dental|cosmetic
// Public service catalog for the landing booking sheet. This mirrors the CTV
// portal picker contract but does not expose admin-only product fields.
router.get('/services', async (req, res) => {
  const lob = normalizeLob(req.query.lob);
  try {
    const db = getDb(lob);
    const rows = await queryRows(
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
        category: r.category_id ? { id: r.category_id, name: r.category_name || null } : null,
      })),
    });
  } catch (e) {
    console.error('[ctvPublic GET /services] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/ctv-public/bookings
// Public no-login booking path for the Tâm landing CTA. Resolves the CTV by
// phone, then follows the same appointment-only claim/reclaim semantics as the
// authenticated CTV booking route.
router.post('/bookings', async (req, res) => {
  const {
    clientId: bodyClientId,
    name,
    phone: rawPhone,
    ctvPhone: rawCtvPhone,
    ctv_phone: rawCtvPhoneSnake,
    lob: bodyLob,
    date,
    time,
    companyId,
    productId,
    note,
  } = req.body || {};

  const phone = normalizePhone(rawPhone);
  const ctvPhone = normalizePhone(rawCtvPhone || rawCtvPhoneSnake);
  const lob = normalizeLob(bodyLob);

  if (!phone || !date || !ctvPhone) {
    return res.status(400).json({
      error: { code: 'VALIDATION', message: 'phone, date, and ctvPhone are required' },
    });
  }

  try {
    const ctv = await resolveCtvByPhone(ctvPhone);
    if (!ctv) {
      return res.status(404).json({
        error: { code: 'P_CTV_NOT_FOUND', message: 'CTV phone number was not found' },
      });
    }

    const employeeId = ctv.id;
    const apptNote = note != null ? String(note).trim().slice(0, 2000) : '';
    const db = getDb(lob);

    let clientId = bodyClientId || null;
    if (!clientId) {
      const found = await queryRows(
        db,
        `SELECT id
           FROM dbo.partners
          WHERE LOWER(phone) = LOWER($1)
            AND COALESCE(isdeleted, false) = false
          LIMIT 1`,
        [phone]
      );
      clientId = found[0]?.id || null;
    }

    if (clientId) {
      const claim = await getReferralClaimStatus(clientId, lob, {});
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
    }

    if (!clientId) {
      clientId = randomUUID();
      const now = new Date().toISOString();
      await queryRows(
        db,
        `INSERT INTO dbo.partners (
          id, name, phone, lob_scope, referred_by_ctv_id, is_ctv, customer, active,
          employee, supplier, isagent, isinsurance, iscompany, ishead,
          isbusinessinvoice, isdeleted, datecreated, lastupdated
        ) VALUES (
          $1, $2, $3, $4, $5, false, true, true,
          false, false, false, false, false, false,
          false, false, $6, $6
        )`,
        [clientId, name || 'Khách CTV', phone, [lob], employeeId, now]
      );
    } else {
      await queryRows(
        db,
        `UPDATE dbo.partners
            SET referred_by_ctv_id = $1,
                customer = true,
                lastupdated = now()
          WHERE id = $2`,
        [employeeId, clientId]
      );
    }

    let validProductId = null;
    if (productId) {
      const prodRows = await queryRows(
        db,
        `SELECT id FROM dbo.products WHERE id = $1 AND active = true LIMIT 1`,
        [productId]
      );
      validProductId = prodRows[0]?.id || null;
    } else {
      const referralRows = await safeRows(
        db,
        `SELECT p.id
           FROM dbo.commission_settings cs
           JOIN dbo.products p ON p.id = cs.referral_start_product_id
          WHERE p.active = true
          LIMIT 1`
      );
      validProductId = referralRows[0]?.id || null;
    }

    // Public bookings carry no branch picker, so default to this LOB's primary
    // company (appointments.companyid is NOT NULL). The clinic can reassign later.
    let resolvedCompanyId = companyId || null;
    if (!resolvedCompanyId) {
      const companyRows = await safeRows(
        db,
        `SELECT id
           FROM dbo.companies
          ORDER BY datecreated NULLS LAST
          LIMIT 1`
      );
      resolvedCompanyId = companyRows[0]?.id || null;
    }

    // appointments.companyid is NOT NULL. Without a branch we would hit an opaque
    // 500 from the DB constraint, so fail early with an actionable message.
    if (!resolvedCompanyId) {
      return res.status(400).json({
        error: { code: 'E_NO_COMPANIES', message: 'No clinic branch is configured for this line of business' },
      });
    }

    const apptId = randomUUID();
    const nameResult = await queryRows(
      db,
      "SELECT COALESCE(MAX(CAST(SUBSTRING(name FROM 3) AS INTEGER)), 0) + 1 AS next_seq FROM dbo.appointments WHERE name LIKE 'AP%'"
    );
    const nextSeq = nameResult[0]?.next_seq || 1;
    const apptName = `AP${String(nextSeq).padStart(6, '0')}`;

    await queryRows(
      db,
      `INSERT INTO dbo.appointments (
        id, name, date, time, partnerid, doctorid, companyid, note, timeexpected,
        color, state, aptstate, isrepeatcustomer, isnotreatment, productid, assistantid, dentalaideid,
        ctv_id, datecreated, lastupdated
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, false, $13, $14, $15, $16,
        (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'),
        (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
      )`,
      [
        apptId,
        apptName,
        date,
        time || null,
        clientId,
        null,
        resolvedCompanyId,
        apptNote,
        30,
        '1',
        'confirmed',
        'confirmed',
        validProductId,
        null,
        null,
        employeeId,
      ]
    );

    return res.status(201).json({ clientId, appointmentId: apptId });
  } catch (e) {
    console.error('[ctvPublic POST /bookings] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ctv-public/refcode/:code — public; reveals only the upline's display name.
router.get('/refcode/:code', async (req, res) => {
  try {
    const upline = await resolveUpline(req.params.code);
    if (!upline) return res.status(404).json({ ok: false, error: { code: 'U_INVALID_CODE', message: 'Referral code not found' } });
    return res.json({ ok: true, uplineId: upline.id, uplineName: upline.name || null });
  } catch (e) {
    console.error('[ctvPublic GET /refcode] error:', e.message);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// GET /api/ctv-public/ctv-lookup?phone=... — public live validation for landing forms.
router.get('/ctv-lookup', async (req, res) => {
  const phone = normalizePhone(req.query.phone);
  if (!phone) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'phone is required' } });
  }

  try {
    const ctv = await resolveCtvByPhone(phone);
    return res.json({
      exists: !!ctv,
      name: ctv?.name || null,
    });
  } catch (e) {
    console.error('[ctvPublic GET /ctv-lookup] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/ctv-public/join — public self-signup under a referral code or upline CTV phone.
router.post('/join', async (req, res) => {
  const {
    code,
    name: rawName,
    phone: rawPhone,
    email: rawEmail,
    password,
    uplinePhone: rawUplinePhone,
    upline_phone: rawUplinePhoneSnake,
  } = req.body || {};
  const name = rawName == null ? '' : String(rawName).trim();
  const phone = normalizePhone(rawPhone);
  const email = rawEmail == null ? '' : String(rawEmail).trim();
  const uplinePhone = normalizePhone(rawUplinePhone || rawUplinePhoneSnake);

  /**
   * @crossref:domain[ctv-creation]
   * Backend endpoint: POST /api/ctv-public/join (public/portal CTV self-signup)
   *
   * Absolute path references (SSOT + consumers + governance):
   *   SSOT: /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/components/shared/CtvCreationForm/
   *   Call sites:
   *     - /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/components/commission/CtvManagementTab.tsx (AddCtvModal, mode 'admin')
   *     - /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/components/ctv/CtvRecruitModal.tsx (mode 'portal-recruit')
   *     - /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/pages/CTV/JoinCtv.tsx (mode 'public-join' + upline/beforeLobs/root gate)
   *   Governance: /Users/thuanle/Documents/TamTMV/Tgrouptest/AGENTS.md §5.1 (CTV / Identity Domain SSOT Enforcement)
   *   Product map: /Users/thuanle/Documents/TamTMV/Tgrouptest/product-map/domains/ctv.yaml (creation subsection)
   *   Types/contract: /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/lib/api/ctv.ts (CtvJoinInput, joinCtv, CreateCtvInput parity)
   *
   * Invariants (client+server; see AGENTS.md §5.1 and product-map ctv.yaml):
   *   - Email OPTIONAL: only name + phone + password required (dup email check ONLY if supplied; store NULL if blank/omitted; clean payload from SSOT omits falsy email).
   *   - lob_scope: dental ALWAYS forced/normalized into array (backend prepends for dental auth row + writes); cosmetic additive.
   *   - Cross-DB atomic writes (dental always + cosmetic if scoped) with explicit rollback DELETE on partial failure (E_CTV_CREATE_FAILED).
   *   - Specific error codes: VALIDATION, U_DUPLICATE_PHONE, U_DUPLICATE_EMAIL (only-if-supplied), U_WEAK_PASSWORD, U_UPLINE_REQUIRED (unless root), E_CTV_CREATE_FAILED.
   *
   * This is the public counterpart to the authed POST /api/ctv create path in ctv.js.
   * @crossref:uses[shared/CtvCreationForm (SSOT), joinCtv wrapper in JoinCtv.tsx, resolveUpline/resolveCtvByPhone local helpers here, getDb('dental'|'cosmetic') + safeRows for dual-DB]
   * @crossref:used-in[public unauthed CTV join flow; also portal-recruit via CtvRecruitModal calling createCtv which is the other route; mounted at /api/ctv-public by api/src/server.js (before auth gate); frontend client website/src/lib/api/ctv.ts]
   */
  // Email is OPTIONAL (spec §12): only name, phone, and password are required.  [enhanced with @crossref per AGENTS.md §5.1; see block above]
  if (!name || !phone || !password) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'Missing required fields: name, phone, password' } });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: { code: 'U_WEAK_PASSWORD', message: 'Password must be at least 6 characters' } });
  }
  // Root/top-level CTV signup (no upline) is gated to NK3 via CTV_PUBLIC_ROOT_SIGNUP so
  // NK/NK2 keep requiring an upline until this feature is migrated.
  const allowRootSignup = process.env.CTV_PUBLIC_ROOT_SIGNUP === 'true' || process.env.CTV_PUBLIC_ROOT_SIGNUP === '1';
  if (!code && !uplinePhone && !allowRootSignup) {
    return res.status(400).json({ error: { code: 'U_UPLINE_REQUIRED', message: 'Referral code or upline CTV phone is required' } });
  }

  try {
    // Resolve the upline only when one was supplied. With root signup enabled and no
    // code/phone, `upline` stays null and the new CTV becomes a root (referred_by_ctv_id = NULL).
    const upline = uplinePhone
      ? await resolveCtvByPhone(uplinePhone)
      : (code ? await resolveUpline(code) : null);
    if ((uplinePhone || code) && !upline) {
      return res.status(404).json({
        error: {
          code: uplinePhone ? 'U_INVALID_UPLINE' : 'U_INVALID_CODE',
          message: uplinePhone ? 'Upline CTV phone not found' : 'Referral code not found',
        },
      });
    }

    const dentalDb = getDb('dental');
    const cosmeticDb = getDb('cosmetic');

    // Duplicate phone guard across both physical DBs. Email is only checked when supplied
    // — a blank optional email must not collide with other blank-email rows.
    const dupChecks = [
      safeRows(dentalDb, 'SELECT id FROM dbo.partners WHERE LOWER(phone) = LOWER($1) LIMIT 1', [phone]),
      safeRows(cosmeticDb, 'SELECT id FROM dbo.partners WHERE LOWER(phone) = LOWER($1) LIMIT 1', [phone]),
    ];
    if (email) {
      dupChecks.push(safeRows(dentalDb, 'SELECT id FROM dbo.partners WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]));
      dupChecks.push(safeRows(cosmeticDb, 'SELECT id FROM dbo.partners WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]));
    }
    const [dPhone, cPhone, dEmail = [], cEmail = []] = await Promise.all(dupChecks);
    if (dPhone.length || cPhone.length) {
      return res.status(400).json({ error: { code: 'U_DUPLICATE_PHONE', message: 'Phone number already exists' } });
    }
    if (dEmail.length || cEmail.length) {
      return res.status(400).json({ error: { code: 'U_DUPLICATE_EMAIL', message: 'Email already exists' } });
    }

    // Inherit the upline's LOB scope so the new CTV lives in the same line(s) of business.
    // A root CTV (no upline) defaults to both LOBs so it can operate across the clinic.
    const uplineScope = upline && Array.isArray(upline.lob_scope) && upline.lob_scope.length ? upline.lob_scope : ['dental'];
    const lobScope = upline
      ? Array.from(new Set(['dental', ...uplineScope.filter((l) => l === 'dental' || l === 'cosmetic')]))
      : ['dental', 'cosmetic'];

    const passwordHash = await bcrypt.hash(String(password), 10);
    const id = randomUUID();
    const now = new Date().toISOString();
    const insertSql = `
      INSERT INTO dbo.partners (
        id, name, phone, email, password_hash, is_ctv, lob_scope, referred_by_ctv_id,
        active, employee, customer, supplier, isagent, isinsurance, iscompany, ishead,
        isbusinessinvoice, isdeleted, datecreated, lastupdated
      ) VALUES (
        $1, $2, $3, $4, $5, true, $6, $7,
        true, true, false, false, false, false, false, false,
        false, false, $8, $8
      ) RETURNING id, name, phone, email, referred_by_ctv_id
    `;
    const params = [id, name, phone, email || null, passwordHash, lobScope, upline ? upline.id : null, now];

    // Cross-LOB writes must be all-or-nothing. A CTV that exists in dental but
    // not cosmetic (or vice-versa) is a split-brain state that breaks login,
    // referral-claim lookups, and commission queries. `safeRows` swallows DB
    // errors and returns [], so we insert sequentially and verify each write,
    // compensating (deleting the dental row) if the cosmetic insert does not land.
    const dentalInsert = await safeRows(dentalDb, insertSql, params);
    const created = dentalInsert[0];
    if (!created) {
      return res.status(500).json({ error: { code: 'E_CTV_CREATE_FAILED', message: 'Failed to create CTV' } });
    }

    if (lobScope.includes('cosmetic')) {
      const cosmeticInsert = await safeRows(cosmeticDb, insertSql, params);
      if (!cosmeticInsert[0]) {
        // Roll back the dental row so the CTV is never left half-created.
        await safeRows(dentalDb, 'DELETE FROM dbo.partners WHERE id = $1', [id]);
        return res.status(500).json({
          error: { code: 'E_CTV_CREATE_FAILED', message: 'Failed to create CTV across all line(s) of business' },
        });
      }
    }

    return res.status(201).json({ ok: true, id: created.id, name: created.name, uplineName: upline ? upline.name || null : null });
  } catch (e) {
    console.error('[ctvPublic POST /join] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:route[discountCodes]
 * @crossref:used-in[NK3 staff discount QR verification + CTV portal code generation/tracking]
 * @crossref:uses[product-map/domains/ctv.yaml, api/src/services/ctvDiscountCodes.js, docs/CONTRACTS.md]
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const { requireAuth } = require('../middleware/auth');
const { getDb } = require('../db');
const { safeQueryRows, isCtvUser } = require('./ctvHelpers');
const { getReferralClaimStatus } = require('../services/referralClaim');
const {
  buildCtvShortCode,
  checkExistingCodeForVisitor,
  createCustomerForCtv,
  fetchCodeRow,
  formatDiscount,
  generateCodeForCtv,
  getCtvCodeStats,
  getClientIp,
  getQrDiscountSettings,
  listAllDiscountCodes,
  listCtvCodes,
  lookupClientForDiscountVerify,
  mapLookupResponse,
  reclaimClientForCtv,
  resolveCtvByShortCode,
} = require('../services/ctvDiscountCodes');

const router = express.Router();

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    /* public fan landing may call without valid staff/ctv token */
  }
  return next();
}

function requireStaff(req, res, next) {
  if (!req.user?.employeeId) {
    return res.status(401).json({ error: { code: 'NO_TOKEN', message: 'No token' } });
  }
  if (isCtvUser(req.user)) {
    return res.status(403).json({
      error: {
        code: 'S_STAFF_REQUIRED',
        message: 'Staff login required — CTV accounts cannot verify discount codes',
      },
    });
  }
  next();
}

function requireCtvSelf(req, res, next) {
  if (!req.user?.employeeId) {
    return res.status(401).json({ error: { code: 'NO_TOKEN', message: 'No token' } });
  }
  if (!isCtvUser(req.user)) {
    return res.status(403).json({ error: { code: 'S_CTV_ONLY', message: 'CTV access required' } });
  }
  next();
}

function formatGeneratePayload(row, ctv, isExisting) {
  return {
    success: true,
    code: row.code,
    isExisting,
    discountValue: Number(row.discount_value),
    discountType: row.discount_type || 'percent',
    discountLabel: formatDiscount(row.discount_value, row.discount_type),
    expiresAt: row.expires_at,
    ctvName: ctv.name,
    shortCode: buildCtvShortCode(ctv.id),
    message: isExisting
      ? 'Bạn đã có mã giảm giá. Sử dụng mã dưới đây!'
      : 'Chúc mừng! Bạn đã nhận được mã giảm giá.',
  };
}
// GET /api/discount-codes/landing/:shortCode — public CTV landing preview
router.get('/landing/:shortCode', async (req, res) => {
  const shortCode = String(req.params.shortCode || '').trim().toUpperCase();
  try {
    const ctv = await resolveCtvByShortCode(shortCode);
    if (!ctv) {
      return res.status(404).json({ success: false, error: { code: 'U_CTV_NOT_FOUND', message: 'Link không hợp lệ' } });
    }
    const settings = await getQrDiscountSettings();
    const ctvIsLive = ctv.is_live === true;
    return res.json({
      success: true,
      ctv: {
        id: ctv.id,
        name: ctv.name,
        shortCode: buildCtvShortCode(ctv.id),
        isLive: ctvIsLive,
        discountValue: ctvIsLive ? settings.livePercent : settings.nonLivePercent,
        discountType: 'percent',
        expiryDays: ctvIsLive ? settings.liveExpiryDays : settings.nonLiveExpiryDays,
      },
    });
  } catch (err) {
    console.error('[discount-codes GET /landing]', err.message);
    return res.status(500).json({ error: { code: 'E_LANDING_FAILED', message: 'Internal server error' } });
  }
});

// GET /api/discount-codes/check-existing?ctvId= — public fan landing dedup
router.get('/check-existing', async (req, res) => {
  const ctvId = String(req.query.ctvId || '').trim();
  const cookieCode = req.cookies?.[`referral_code_${ctvId}`];
  if (!ctvId) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'ctvId is required' } });
  }
  try {
    const visitorIp = getClientIp(req.headers);
    const existing = await checkExistingCodeForVisitor({ ctvId, visitorIp, cookieCode });
    if (!existing) {
      return res.json({ hasCode: false });
    }
    const payload = formatGeneratePayload(existing.row, existing.ctv, true);
    return res.json({
      hasCode: true,
      ...payload,
    });
  } catch (err) {
    console.error('[discount-codes GET /check-existing]', err.message);
    return res.status(500).json({ error: { code: 'E_CHECK_FAILED', message: 'Internal server error' } });
  }
});

// POST /api/discount-codes/generate — fan landing or CTV portal (1 code per click for portal)
router.post('/generate', optionalAuth, async (req, res) => {
  const body = req.body || {};
  const isCtvPortal = isCtvUser(req.user);
  const ctvId = isCtvPortal ? req.user?.employeeId : String(body.ctvId || '').trim();
  const generationSource = isCtvPortal ? 'ctv_portal' : 'fan_landing';
  const forceNew = isCtvPortal || body.forceNew === true;

  if (!ctvId) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'ctvId is required' } });
  }

  try {
    const visitorIp = getClientIp(req.headers);
    const cookieCode = req.cookies?.[`referral_code_${ctvId}`];
    const result = await generateCodeForCtv({
      ctvId,
      visitorIp,
      visitorName: body.visitorName,
      visitorPhone: body.visitorPhone,
      generationSource,
      forceNew,
      cookieCode: forceNew ? null : cookieCode,
    });

    if (result.error) {
      return res.status(result.error.status || 400).json({ success: false, error: result.error });
    }

    if (!result.isExisting) {
      res.cookie(`referral_code_${ctvId}`, result.row.code, {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
        sameSite: 'lax',
      });
    }
    return res.json(formatGeneratePayload(result.row, result.ctv, result.isExisting));
  } catch (err) {
    console.error('[discount-codes POST /generate]', err.message);
    return res.status(500).json({ error: { code: 'E_GENERATE_FAILED', message: 'Internal server error' } });
  }
});

// GET /api/discount-codes/mine — CTV code history (KOL dashboard parity)
router.get('/mine', requireAuth, requireCtvSelf, async (req, res) => {
  const ctvId = req.user.employeeId;
  try {
    const data = await listCtvCodes(ctvId, {
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: parseInt(req.query.page || '1', 10),
      limit: parseInt(req.query.limit || '20', 10),
    });
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error('[discount-codes GET /mine]', err.message);
    return res.status(500).json({ error: { code: 'E_LIST_FAILED', message: 'Internal server error' } });
  }
});

// GET /api/discount-codes/stats — CTV aggregate stats
router.get('/stats', requireAuth, requireCtvSelf, async (req, res) => {
  try {
    const stats = await getCtvCodeStats(req.user.employeeId);
    return res.json({ success: true, stats });
  } catch (err) {
    console.error('[discount-codes GET /stats]', err.message);
    return res.status(500).json({ error: { code: 'E_STATS_FAILED', message: 'Internal server error' } });
  }
});

// GET /api/discount-codes/admin — staff admin view of all codes
router.get('/admin', requireAuth, requireStaff, async (req, res) => {
  const status = String(req.query.status || '').trim() || undefined;
  const search = String(req.query.search || '').trim() || undefined;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  try {
    const result = await listAllDiscountCodes({ status, search, page, limit });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[discount-codes GET /admin]', err.message);
    return res.status(500).json({ error: { code: 'E_ADMIN_CODES_FAILED', message: 'Internal server error' } });
  }
});

// GET /api/discount-codes/lookup?code= — staff preview before verify
router.get('/lookup', requireAuth, requireStaff, async (req, res) => {
  const code = String(req.query.code || '').trim();
  if (!code) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'code is required' } });
  }

  try {
    const row = await fetchCodeRow(code);
    if (!row) {
      return res.json({ found: false, valid: false, code, message: 'Mã không tồn tại' });
    }
    const payload = mapLookupResponse(row);
    if (payload.status === 'used') {
      payload.message = 'Mã đã được sử dụng';
    } else if (payload.status === 'expired') {
      payload.message = 'Mã đã hết hạn';
    } else {
      payload.message = `Mã hợp lệ — ${payload.discountLabel}`;
    }
    return res.json(payload);
  } catch (err) {
    console.error('[discount-codes GET /lookup]', err.message);
    return res.status(500).json({ error: { code: 'E_LOOKUP_FAILED', message: 'Internal server error' } });
  }
});

// GET /api/discount-codes/client-search?phone=&lob=&code= — LOB-specific lookup (CTV booking parity)
router.get('/client-search', requireAuth, requireStaff, async (req, res) => {
  const phone = String(req.query.phone || '').trim();
  const lob = req.query.lob === 'cosmetic' ? 'cosmetic' : 'dental';
  const code = String(req.query.code || '').trim();
  if (!phone || !code) {
    return res.status(400).json({
      error: { code: 'VALIDATION', message: 'phone and code are required' },
    });
  }

  try {
    const row = await fetchCodeRow(code);
    if (!row) {
      return res.status(404).json({ error: { code: 'U_CODE_NOT_FOUND', message: 'Discount code not found' } });
    }
    const result = await lookupClientForDiscountVerify({
      phone,
      lob,
      issuingCtvId: row.ctv_partner_id,
    });
    return res.json(result);
  } catch (err) {
    console.error('[discount-codes GET /client-search]', err.message);
    return res.status(500).json({ error: { code: 'E_SEARCH_FAILED', message: 'Internal server error' } });
  }
});

// POST /api/discount-codes/verify — staff marks code used; can create client if missing
router.post('/verify', requireAuth, requireStaff, async (req, res) => {
  const code = String(req.body?.code || '').trim();
  let customerPartnerId = String(req.body?.customerPartnerId || '').trim();
  let customerLob = req.body?.customerLob === 'cosmetic' ? 'cosmetic' : 'dental';
  const customerPhone = String(req.body?.customerPhone || '').trim();
  const customerName = String(req.body?.customerName || '').trim();
  const createIfMissing = req.body?.createIfMissing === true;

  if (!code || !customerPhone) {
    return res.status(400).json({
      error: { code: 'VALIDATION', message: 'code and customerPhone are required' },
    });
  }

  try {
    const row = await fetchCodeRow(code);
    if (!row) {
      return res.status(404).json({ valid: false, code, message: 'Mã không tồn tại' });
    }
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ valid: false, code, status: 'expired', message: 'Mã đã hết hạn' });
    }
    if (row.status === 'used') {
      return res.status(400).json({
        valid: false,
        code,
        status: 'used',
        message: 'Mã đã được sử dụng',
        usedAt: row.used_at,
        usedByStaffName: row.used_by_staff_name,
      });
    }

    // Staff can check in a claimed/active code, or mark a checked-in code as used
    const markAsUsed = req.body?.markAsUsed === true;
    if (row.status === 'checked_in' && !markAsUsed) {
      return res.status(400).json({
        valid: false,
        code,
        status: 'checked_in',
        message: 'Mã đã được check-in. Chọn "Hoàn tất" để đánh dấu đã sử dụng.',
        checkedInAt: row.checked_in_at,
      });
    }

    // Completing a checked-in code: the customer was already bound at check-in.
    // Prefer that binding over re-resolution — staff may have a different LOB
    // selected or a phone-format mismatch on the completion screen, and
    // completion must never create or rebind a different client.
    if (!customerPartnerId && row.status === 'checked_in' && row.customer_partner_id) {
      customerPartnerId = row.customer_partner_id;
      if (row.customer_lob === 'cosmetic' || row.customer_lob === 'dental') {
        customerLob = row.customer_lob;
      }
    }

    if (customerPartnerId) {
      const claim = await getReferralClaimStatus(customerPartnerId, customerLob, {});
      if (claim.active && claim.ownerCtvId && claim.ownerCtvId !== row.ctv_partner_id) {
        return res.status(400).json({
          error: {
            code: 'B_CLIENT_CLAIMED',
            message: 'Client already active with another CTV',
            ownerName: claim.ownerName,
            expiresAt: claim.expiresAt,
          },
        });
      }
      await reclaimClientForCtv(customerPartnerId, customerLob, row.ctv_partner_id);
    } else if (createIfMissing) {
      if (!customerName) {
        return res.status(400).json({
          error: { code: 'VALIDATION', message: 'customerName is required when creating a new client' },
        });
      }
      const created = await createCustomerForCtv({
        name: customerName,
        phone: customerPhone,
        lob: customerLob,
        referredByCtvId: row.ctv_partner_id,
      });
      if (created.error) {
        return res.status(400).json({ error: created.error });
      }
      customerPartnerId = created.customer.id;
      customerLob = created.lob;
    }

    if (!customerPartnerId) {
      return res.status(400).json({
        error: { code: 'VALIDATION', message: 'customerPartnerId is required' },
      });
    }

    const customerRows = await safeQueryRows(
      getDb(customerLob),
      `SELECT id, name, phone FROM dbo.partners
        WHERE id = $1 AND COALESCE(isdeleted, false) = false
        LIMIT 1`,
      [customerPartnerId]
    );
    if (!customerRows[0]) {
      return res.status(404).json({ error: { code: 'U_CUSTOMER_NOT_FOUND', message: 'Customer not found in selected LOB' } });
    }

    const staffName = req.user.name || req.user.email || 'Staff';
    const now = new Date();
    const nextStatus = row.status === 'checked_in' || markAsUsed ? 'used' : 'checked_in';
    const db = getDb('dental');
    await db.query(
      `UPDATE dbo.ctv_discount_codes
          SET status = $9::varchar,
              used_at = CASE WHEN $9::varchar = 'used' THEN $2 ELSE used_at END,
              used_by_staff_id = CASE WHEN $9::varchar = 'used' THEN $3 ELSE used_by_staff_id END,
              used_by_staff_name = CASE WHEN $9::varchar = 'used' THEN $4 ELSE used_by_staff_name END,
              customer_partner_id = $5,
              customer_lob = $6,
              customer_phone = $7,
              customer_name = $8,
              checked_in_at = COALESCE(checked_in_at, $2)
        WHERE id = $1`,
      [
        row.id,
        now,
        req.user.employeeId,
        staffName,
        customerPartnerId,
        customerLob,
        customerPhone,
        customerName || customerRows[0].name || null,
        nextStatus,
      ]
    );

    return res.json({
      valid: true,
      code: row.code,
      status: nextStatus,
      discountLabel: formatDiscount(row.discount_value, row.discount_type),
      ctvName: row.ctv_name,
      customerName: customerName || customerRows[0].name,
      customerLob,
      message:
        nextStatus === 'used'
          ? `Đã hoàn tất mã — giảm ${formatDiscount(row.discount_value, row.discount_type)}`
          : `Đã check-in mã — giảm ${formatDiscount(row.discount_value, row.discount_type)}`,
      usedAt: nextStatus === 'used' ? now : undefined,
      checkedInAt: now,
    });
  } catch (err) {
    console.error('[discount-codes POST /verify]', err.message);
    return res.status(500).json({ error: { code: 'E_VERIFY_FAILED', message: 'Internal server error' } });
  }
});

// POST /api/discount-codes/ensure — legacy single-code upsert (backward compatible)
router.post('/ensure', requireAuth, requireCtvSelf, async (req, res) => {
  const ctvId = req.user.employeeId;
  const code = buildCtvShortCode(ctvId);
  try {
    const ctv = await fetchCtvPartner(ctvId);
    const settings = await getQrDiscountSettings();
    const ctvIsLive = ctv?.is_live === true;
    const discountValue = ctvIsLive ? settings.livePercent : settings.nonLivePercent;
    const expiryDays = ctvIsLive ? settings.liveExpiryDays : settings.nonLiveExpiryDays;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const existing = await fetchCodeRow(code);
    if (existing && (existing.status === 'used' || existing.status === 'expired')) {
      return res.json({
        code: existing.code,
        discountValue: Number(existing.discount_value),
        discountType: existing.discount_type || 'percent',
        status: existing.status,
        expiresAt: existing.expires_at,
      });
    }

    const db = getDb('dental');
    const rows = await safeQueryRows(
      db,
      `INSERT INTO dbo.ctv_discount_codes (code, ctv_partner_id, discount_value, discount_type, status, expires_at, generation_source)
       VALUES ($1, $2, $3, 'percent', 'active', $4, 'legacy_ensure')
       ON CONFLICT (code) DO UPDATE
         SET discount_value = CASE
               WHEN dbo.ctv_discount_codes.status IN ('active', 'claimed', 'generated', 'checked_in')
                 THEN EXCLUDED.discount_value
               ELSE dbo.ctv_discount_codes.discount_value
             END,
             expires_at = CASE
               WHEN dbo.ctv_discount_codes.status IN ('active', 'claimed', 'generated', 'checked_in')
                 THEN EXCLUDED.expires_at
               ELSE dbo.ctv_discount_codes.expires_at
             END
       RETURNING code, discount_value, discount_type, status, expires_at`,
      [code, ctvId, discountValue, expiresAt]
    );

    const row = rows[0];
    return res.json({
      code: row.code,
      discountValue: Number(row.discount_value),
      discountType: row.discount_type || 'percent',
      status: row.status,
      expiresAt: row.expires_at,
    });
  } catch (err) {
    if (err.message && err.message.includes('ctv_discount_codes')) {
      console.error('[discount-codes POST /ensure] table missing — run migration 062/063');
      return res.status(503).json({
        error: { code: 'E_SCHEMA_PENDING', message: 'Discount codes not configured yet' },
      });
    }
    console.error('[discount-codes POST /ensure]', err.message);
    return res.status(500).json({ error: { code: 'E_ENSURE_FAILED', message: 'Internal server error' } });
  }
});

module.exports = router;
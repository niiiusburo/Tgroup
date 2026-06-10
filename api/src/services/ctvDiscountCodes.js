'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:function[ctvDiscountCodes]
 * @crossref:used-in[api/src/routes/discountCodes.js]
 * @crossref:uses[product-map/domains/ctv.yaml, api/src/db.js, api/src/routes/ctvHelpers.js (safeQueryRows), api/src/services/referralClaim.js]
 */
const { randomUUID } = require('crypto');
const { getDb } = require('../db');
const { safeQueryRows } = require('../routes/ctvHelpers');
const { getReferralClaimStatus } = require('./referralClaim');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_NON_LIVE_PERCENT = 10;

/** Read global QR discount settings from systempreferences (dental DB). */
async function getQrDiscountSettings() {
  const db = getDb('dental');
  const keys = [
    'discount.live_percent',
    'discount.nonlive_percent',
    'discount.live_expiry_days',
    'discount.nonlive_expiry_days',
    'discount.live_slogan',
    'discount.nonlive_slogan',
  ];
  const rows = await safeQueryRows(
    db,
    `SELECT key, value FROM dbo.systempreferences WHERE key = ANY($1)`,
    [keys]
  );
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    livePercent: Number(map['discount.live_percent'] ?? 20),
    nonLivePercent: Number(map['discount.nonlive_percent'] ?? 10),
    liveExpiryDays: Number(map['discount.live_expiry_days'] ?? 30),
    nonLiveExpiryDays: Number(map['discount.nonlive_expiry_days'] ?? 30),
    liveSlogan: String(map['discount.live_slogan'] ?? 'Cho tất cả dịch vụ làm đẹp ✨'),
    nonLiveSlogan: String(map['discount.nonlive_slogan'] ?? 'Cho tất cả dịch vụ làm đẹp ✨'),
  };
}

function getCtvCodePrefix(name) {
  const clean = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  return clean.slice(0, 10) || 'CTV';
}

function buildCtvShortCode(partnerId) {
  const source = String(partnerId || '000000').replace(/-/g, '');
  return `CTV-${source.slice(0, 6).toUpperCase()}`;
}

function shortCodeSuffix(shortCode) {
  return String(shortCode || '').replace(/^CTV-/i, '').toLowerCase();
}

function hasMatchingCodePrefix(code, prefixSource) {
  const prefix = getCtvCodePrefix(prefixSource);
  return String(code || '').toUpperCase().startsWith(`${prefix}-`);
}

function generateDiscountCodeString(prefixSource) {
  const prefix = getCtvCodePrefix(prefixSource);
  let randomPart = '';
  for (let i = 0; i < 6; i += 1) {
    randomPart += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return `${prefix}-${randomPart}`;
}

function formatDiscount(value, type) {
  const num = Number(value);
  if (type === 'fixed' || num > 100) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  }
  return `${num}%`;
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

function maskPhone(phone) {
  const value = String(phone || '');
  if (value.length < 4) return value;
  return `xx${value.slice(-4)}`;
}

function getClientIp(headers = {}) {
  const forwarded = headers['x-forwarded-for'];
  if (forwarded) {
    const first = String(forwarded).split(',')[0].trim();
    if (first) return first;
  }
  return headers['x-real-ip'] || headers['cf-connecting-ip'] || '0.0.0.0';
}

function normalizePhone(phone) {
  let cleaned = String(phone || '').replace(/\D/g, '');
  if (cleaned.startsWith('84') && cleaned.length > 9) cleaned = `0${cleaned.slice(2)}`;
  if (!cleaned.startsWith('0') && cleaned.length === 9) cleaned = `0${cleaned}`;
  return cleaned;
}

function effectiveStatus(row) {
  if (!row) return null;
  if (isExpired(row.expires_at) && row.status !== 'used') return 'expired';
  return row.status;
}

function isUsableStatus(status) {
  return status === 'active' || status === 'claimed' || status === 'generated' || status === 'checked_in';
}

async function fetchCtvPartner(ctvId) {
  const db = getDb('dental');
  const rows = await safeQueryRows(
    db,
    `SELECT id, name, phone, active, is_ctv, is_live
       FROM dbo.partners
      WHERE id = $1 AND is_ctv = true AND COALESCE(isdeleted, false) = false
      LIMIT 1`,
    [ctvId]
  );
  return rows[0] || null;
}

async function resolveCtvByShortCode(shortCode) {
  const suffix = shortCodeSuffix(shortCode);
  if (!suffix || suffix.length < 4) return null;
  const db = getDb('dental');
  const rows = await safeQueryRows(
    db,
    `SELECT id, name, phone, active, is_ctv, is_live
       FROM dbo.partners
      WHERE is_ctv = true
        AND COALESCE(isdeleted, false) = false
        AND COALESCE(active, true) = true
        AND LOWER(REPLACE(id::text, '-', '')) LIKE $1 || '%'
      LIMIT 5`,
    [suffix]
  );
  return rows.find((row) => buildCtvShortCode(row.id).toUpperCase() === String(shortCode).toUpperCase()) || null;
}

async function fetchCodeRow(code) {
  const db = getDb('dental');
  const rows = await safeQueryRows(
    db,
    `SELECT c.*, p.name AS ctv_name, p.phone AS ctv_phone, c.payment_id
       FROM dbo.ctv_discount_codes c
       JOIN dbo.partners p ON p.id = c.ctv_partner_id
      WHERE UPPER(c.code) = UPPER($1)
      LIMIT 1`,
    [code]
  );
  return rows[0] || null;
}

async function findReusableCode({ ctvId, ctvName, visitorIp, cookieCode }) {
  const prefixSource = ctvName || 'CTV';
  const db = getDb('dental');

  if (cookieCode) {
    const row = await fetchCodeRow(cookieCode);
    const status = effectiveStatus(row);
    if (
      row
      && row.ctv_partner_id === ctvId
      && isUsableStatus(status)
      && hasMatchingCodePrefix(row.code, prefixSource)
    ) {
      return row;
    }
  }

  const ipRows = await safeQueryRows(
    db,
    `SELECT *
       FROM dbo.ctv_discount_codes
      WHERE ctv_partner_id = $1
        AND visitor_ip = $2
        AND status IN ('claimed', 'generated', 'active', 'checked_in')
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY created_at DESC
      LIMIT 10`,
    [ctvId, visitorIp]
  );

  return ipRows.find((row) => hasMatchingCodePrefix(row.code, prefixSource)) || null;
}

async function insertDiscountCode({
  ctvId,
  ctvName,
  discountValue,
  discountType,
  expiresAt,
  visitorIp,
  visitorName,
  visitorPhone,
  generationSource,
  status,
}) {
  const db = getDb('dental');
  let retries = 5;
  while (retries > 0) {
    const code = generateDiscountCodeString(ctvName);
    try {
      const rows = await safeQueryRows(
        db,
        `INSERT INTO dbo.ctv_discount_codes (
           code, ctv_partner_id, discount_value, discount_type, status, expires_at,
           visitor_ip, visitor_name, customer_phone, claimed_at, generation_source
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          code,
          ctvId,
          discountValue,
          discountType,
          status,
          expiresAt,
          visitorIp || null,
          visitorName || null,
          visitorPhone || null,
          status === 'claimed' ? new Date() : null,
          generationSource,
        ]
      );
      return rows[0];
    } catch (err) {
      if (String(err.message || '').includes('unique') && retries > 1) {
        retries -= 1;
        continue;
      }
      throw err;
    }
  }
  throw new Error('Failed to generate unique discount code');
}

async function generateCodeForCtv({
  ctvId,
  visitorIp,
  visitorName,
  visitorPhone,
  generationSource,
  forceNew = false,
  cookieCode,
}) {
  const ctv = await fetchCtvPartner(ctvId);
  if (!ctv || !ctv.active) {
    return { error: { code: 'U_CTV_NOT_FOUND', message: 'CTV không tồn tại hoặc đã ngưng hoạt động', status: 404 } };
  }

  if (!forceNew) {
    const existing = await findReusableCode({
      ctvId,
      ctvName: ctv.name,
      visitorIp,
      cookieCode,
    });
    if (existing) {
      return {
        row: existing,
        isExisting: true,
        ctv,
      };
    }
  }
  const settings = await getQrDiscountSettings();
  const ctvIsLive = ctv.is_live === true;
  const discountValue = ctvIsLive ? settings.livePercent : settings.nonLivePercent;
  const expiryDays = ctvIsLive ? settings.liveExpiryDays : settings.nonLiveExpiryDays;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  const row = await insertDiscountCode({
    ctvId,
    ctvName: ctv.name,
    discountValue,
    discountType: 'percent',
    expiresAt,
    visitorIp,
    visitorName,
    visitorPhone,
    generationSource,
    status: 'claimed',
  });

  return { row, isExisting: false, ctv };
}

async function listCtvCodes(ctvId, { status, startDate, endDate, page = 1, limit = 20 } = {}) {
  const db = getDb('dental');
  const clauses = ['ctv_partner_id = $1'];
  const params = [ctvId];
  let idx = 2;

  if (status && status !== 'all') {
    clauses.push(`status = $${idx}`);
    params.push(status);
    idx += 1;
  }
  if (startDate) {
    clauses.push(`created_at >= $${idx}`);
    params.push(new Date(startDate));
    idx += 1;
  }
  if (endDate) {
    clauses.push(`created_at <= $${idx}`);
    params.push(new Date(endDate));
    idx += 1;
  }

  const where = clauses.join(' AND ');
  const offset = (Math.max(1, page) - 1) * limit;

  const [rows, countRows] = await Promise.all([
    safeQueryRows(
      db,
      `SELECT id, code, status, visitor_name, customer_phone, customer_name,
              discount_value, discount_type, created_at, claimed_at, used_at, expires_at
         FROM dbo.ctv_discount_codes
        WHERE ${where}
        ORDER BY created_at DESC
        LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    ),
    safeQueryRows(db, `SELECT COUNT(*)::int AS total FROM dbo.ctv_discount_codes WHERE ${where}`, params),
  ]);

  return {
    codes: rows.map((row) => ({
      id: row.id,
      code: row.code,
      status: effectiveStatus(row),
      visitorName: row.visitor_name || row.customer_name || null,
      visitorPhone: row.customer_phone ? maskPhone(row.customer_phone) : null,
      discountValue: Number(row.discount_value),
      discountType: row.discount_type || 'percent',
      discountLabel: formatDiscount(row.discount_value, row.discount_type),
      generatedAt: row.created_at,
      claimedAt: row.claimed_at,
      usedAt: row.used_at,
      expiresAt: row.expires_at,
    })),
    pagination: {
      page: Math.max(1, page),
      limit,
      total: countRows[0]?.total || 0,
      totalPages: Math.ceil((countRows[0]?.total || 0) / limit) || 1,
    },
  };
}
async function listAllDiscountCodes({ status, search, page = 1, limit = 20 } = {}) {
  const db = getDb('dental');
  const clauses = [];
  const params = [];
  let idx = 1;

  if (status && status !== 'all') {
    clauses.push(`c.status = $${idx}`);
    params.push(status);
    idx += 1;
  }
  if (search) {
    const term = `%${search}%`;
    clauses.push(`(c.code ILIKE $${idx} OR c.visitor_name ILIKE $${idx} OR c.customer_name ILIKE $${idx} OR p.name ILIKE $${idx})`);
    params.push(term);
    idx += 1;
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const offset = (Math.max(1, page) - 1) * limit;

  const [rows, countRows] = await Promise.all([
    safeQueryRows(
      db,
      `SELECT c.id, c.code, c.status, c.visitor_name, c.customer_phone, c.customer_name,
              c.discount_value, c.discount_type, c.created_at, c.claimed_at, c.used_at,
              c.expires_at, c.checked_in_at, c.customer_lob, c.used_by_staff_name, c.payment_id,
              p.name AS ctv_name, p.phone AS ctv_phone
         FROM dbo.ctv_discount_codes c
         LEFT JOIN dbo.partners p ON p.id = c.ctv_partner_id
        ${where}
        ORDER BY c.created_at DESC
        LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    ),
    safeQueryRows(db, `SELECT COUNT(*)::int AS total FROM dbo.ctv_discount_codes c LEFT JOIN dbo.partners p ON p.id = c.ctv_partner_id ${where}`, params),
  ]);

  return {
    codes: rows.map((row) => ({
      id: row.id,
      code: row.code,
      status: effectiveStatus(row),
      visitorName: row.visitor_name || row.customer_name || null,
      visitorPhone: row.customer_phone ? maskPhone(row.customer_phone) : null,
      discountValue: Number(row.discount_value),
      discountType: row.discount_type || 'percent',
      discountLabel: formatDiscount(row.discount_value, row.discount_type),
      generatedAt: row.created_at,
      claimedAt: row.claimed_at,
      usedAt: row.used_at,
      checkedInAt: row.checked_in_at,
      expiresAt: row.expires_at,
      customerLob: row.customer_lob,
      usedByStaffName: row.used_by_staff_name,
      ctvName: row.ctv_name,
      ctvPhone: row.ctv_phone,
      paymentId: row.payment_id,
    })),
    pagination: {
      page: Math.max(1, page),
      limit,
      total: countRows[0]?.total || 0,
      totalPages: Math.ceil((countRows[0]?.total || 0) / limit) || 1,
    },
  };
}
async function getCtvCodeStats(ctvId) {
  const db = getDb('dental');
  const rows = await safeQueryRows(
    db,
    `SELECT status, COUNT(*)::int AS count
       FROM dbo.ctv_discount_codes
      WHERE ctv_partner_id = $1
      GROUP BY status`,
    [ctvId]
  );

  const byStatus = Object.fromEntries(rows.map((r) => [r.status, r.count]));
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const used = byStatus.used || 0;

  return {
    totalCodes: total,
    usedCodes: used,
    claimedCodes: (byStatus.claimed || 0) + (byStatus.generated || 0) + (byStatus.active || 0),
    checkedInCodes: byStatus.checked_in || 0,
    conversionRate: total > 0 ? ((used / total) * 100).toFixed(1) : '0.0',
  };
}

async function clientHasServiceInLob(clientId, lob) {
  const db = getDb(lob);
  const [apptRows, orderRows] = await Promise.all([
    safeQueryRows(
      db,
      `SELECT 1 AS hit FROM dbo.appointments
        WHERE partnerid = $1 AND COALESCE(state, '') NOT ILIKE 'cancel%'
        LIMIT 1`,
      [clientId]
    ),
    safeQueryRows(
      db,
      `SELECT 1 AS hit FROM dbo.saleorders
        WHERE partnerid = $1
          AND COALESCE(isdeleted, false) = false
          AND COALESCE(state, '') NOT ILIKE 'cancel%'
        LIMIT 1`,
      [clientId]
    ),
  ]);
  return apptRows.length > 0 || orderRows.length > 0;
}

/** LOB-specific phone lookup — mirrors GET /api/ctv/client-lookup for staff discount verify. */
async function lookupClientForDiscountVerify({ phone, lob, issuingCtvId }) {
  const normalizedLob = lob === 'cosmetic' ? 'cosmetic' : 'dental';
  const db = getDb(normalizedLob);
  const rows = await safeQueryRows(
    db,
    `SELECT id, name, phone FROM dbo.partners
      WHERE LOWER(phone) = LOWER($1) AND COALESCE(isdeleted, false) = false
      LIMIT 1`,
    [phone]
  );

  if (!rows[0]) {
    return { exists: false, lob: normalizedLob, hasService: false };
  }

  const clientId = rows[0].id;
  const claim = await getReferralClaimStatus(clientId, normalizedLob, {});
  const claimedByOther = !!(claim.active && claim.ownerCtvId && claim.ownerCtvId !== issuingCtvId);
  const claimedByIssuingCtv = !!(claim.active && claim.ownerCtvId === issuingCtvId);
  const hasService = await clientHasServiceInLob(clientId, normalizedLob);

  return {
    exists: true,
    lob: normalizedLob,
    clientId,
    name: rows[0].name || null,
    phone: rows[0].phone || null,
    claimed: claimedByOther,
    claimedByMe: claimedByIssuingCtv,
    ownerName: claimedByOther ? claim.ownerName || null : null,
    expiresAt: claimedByOther ? claim.expiresAt || null : null,
    hasService,
  };
}

async function reclaimClientForCtv(clientId, lob, referredByCtvId) {
  const db = getDb(lob);
  await safeQueryRows(
    db,
    `UPDATE dbo.partners
        SET referred_by_ctv_id = $1,
            customer = true,
            lastupdated = now()
      WHERE id = $2`,
    [referredByCtvId, clientId]
  );
}

async function createCustomerForCtv({
  name,
  phone,
  lob,
  referredByCtvId,
}) {
  const normalizedPhone = normalizePhone(phone);
  const db = getDb(lob);
  const otherLob = lob === 'dental' ? 'cosmetic' : 'dental';
  const phoneCheckSql = `SELECT id FROM dbo.partners WHERE LOWER(phone) = LOWER($1) LIMIT 1`;

  const [dupInLob, dupInOtherLob] = await Promise.all([
    safeQueryRows(db, phoneCheckSql, [normalizedPhone]),
    safeQueryRows(getDb(otherLob), phoneCheckSql, [normalizedPhone]),
  ]);

  const existingMatch = dupInLob[0]
    ? { id: dupInLob[0].id, sourceLob: lob }
    : dupInOtherLob[0]
      ? { id: dupInOtherLob[0].id, sourceLob: otherLob }
      : null;

  if (existingMatch) {
    const claim = await getReferralClaimStatus(existingMatch.id, existingMatch.sourceLob, {});
    if (claim.active && claim.ownerCtvId && claim.ownerCtvId !== referredByCtvId) {
      return {
        error: {
          code: 'B_CLIENT_CLAIMED',
          message: 'Client already active with another CTV',
          ownerName: claim.ownerName,
        },
      };
    }
    if (existingMatch.sourceLob === lob) {
      await reclaimClientForCtv(existingMatch.id, lob, referredByCtvId);
      const rows = await safeQueryRows(
        db,
        `SELECT id, name, phone FROM dbo.partners
          WHERE id = $1 AND COALESCE(isdeleted, false) = false LIMIT 1`,
        [existingMatch.id]
      );
      return { customer: rows[0], created: false, lob, reclaimed: true };
    }
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const rows = await safeQueryRows(
    db,
    `INSERT INTO dbo.partners (
       id, name, phone, lob_scope, referred_by_ctv_id,
       is_ctv, customer, active, employee, supplier, isagent, isinsurance, iscompany, ishead,
       isbusinessinvoice, isdeleted, datecreated, lastupdated
     ) VALUES (
       $1, $2, $3, $4, $5,
       false, true, true, false, false, false, false, false, false,
       false, false, $6, $6
     ) RETURNING id, name, phone`,
    [id, name, normalizedPhone, [lob], referredByCtvId, now]
  );

  return { customer: rows[0], created: true, lob };
}

function mapLookupResponse(row) {
  const status = effectiveStatus(row);
  return {
    found: true,
    valid: isUsableStatus(status),
    code: row.code,
    status,
    discountValue: Number(row.discount_value),
    discountType: row.discount_type || 'percent',
    discountLabel: formatDiscount(row.discount_value, row.discount_type),
    ctvName: row.ctv_name || null,
    ctvPhone: row.ctv_phone || null,
    expiresAt: row.expires_at || null,
    customerName: row.customer_name || row.visitor_name || null,
    customerPhone: row.customer_phone || null,
    usedAt: row.used_at || null,
    usedByStaffName: row.used_by_staff_name || null,
  };
}

async function checkExistingCodeForVisitor({ ctvId, visitorIp, cookieCode }) {
  const ctv = await fetchCtvPartner(ctvId);
  if (!ctv) return null;
  const row = await findReusableCode({
    ctvId,
    ctvName: ctv.name,
    visitorIp,
    cookieCode,
  });
  if (!row) return null;
  return { row, ctv };
}

module.exports = {
  DEFAULT_NON_LIVE_PERCENT,
  buildCtvShortCode,
  checkExistingCodeForVisitor,
  createCustomerForCtv,
  effectiveStatus,
  fetchCodeRow,
  fetchCtvPartner,
  formatDiscount,
  generateCodeForCtv,
  generateDiscountCodeString,
  getCtvCodePrefix,
  getCtvCodeStats,
  getClientIp,
  getQrDiscountSettings,
  isUsableStatus,
  listAllDiscountCodes,
  listCtvCodes,
  mapLookupResponse,
  maskPhone,
  normalizePhone,
  lookupClientForDiscountVerify,
  reclaimClientForCtv,
  resolveCtvByShortCode,
};
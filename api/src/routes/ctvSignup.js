/**
 * ctvSignup.js — Public CTV self-signup endpoints
 * POST /api/ctv/signup          — create CTV in both DBs
 * GET  /api/ctv/check-referrer-phone — resolve upline CTV by phone
 * POST /api/ctv/signup/ocr      — Gemini Vision ID card OCR
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../db');
const { hash: hashPassword } = require('../services/passwordService');
const { normalizePhone } = require('../services/phoneNormalize');
const { extractIdCard, isConfigured: isOcrConfigured } = require('../services/ocrService');

const router = express.Router();

// OCR rate limit: 5 calls per IP per day
const ocrLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'OCR limit reached (5 per day)' },
  }),
});

/**
 * GET /api/ctv/check-referrer-phone?phone=...
 * Normalizes phone and looks up CTV across both DBs.
 */
router.get('/check-referrer-phone', async (req, res) => {
  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'phone required' } });
  }

  const normalized = normalizePhone(phone);
  if (!normalized) {
    return res.json({ found: false, phone });
  }

  try {
    const dentalDb = getDb('dental');
    const cosmeticDb = getDb('cosmetic');

    // Search both DBs for a CTV with this phone
    const searchSql = `
      SELECT id, name, phone, email
      FROM dbo.partners
      WHERE phone = $1 AND is_ctv = true AND active = true AND isdeleted = false
      LIMIT 1
    `;

    const [dRows, cRows] = await Promise.all([
      dentalDb.queryRows(searchSql, [normalized]),
      cosmeticDb.queryRows(searchSql, [normalized]),
    ]);

    const match = dRows[0] || cRows[0];
    if (match) {
      return res.json({
        found: true,
        id: match.id,
        name: match.name,
        phone: match.phone,
        email: match.email,
      });
    }

    return res.json({ found: false, phone: normalized });
  } catch (err) {
    console.error('[check-referrer-phone] error:', err);
    return res.status(500).json({ error: { code: 'DB_ERROR', message: 'Lookup failed' } });
  }
});

/**
 * POST /api/ctv/signup/ocr
 * Body: { image: base64_string }
 * Returns: { name, dob, id_number }
 */
router.post('/signup/ocr', ocrLimiter, async (req, res) => {
  if (!isOcrConfigured()) {
    return res.status(503).json({
      error: { code: 'OCR_NOT_CONFIGURED', message: 'ID card OCR is not available' },
    });
  }

  const { image } = req.body || {};
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'image (base64) required' } });
  }

  // Validate image size (base64 → bytes)
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length > 2 * 1024 * 1024) {
    return res.status(413).json({ error: { code: 'IMAGE_TOO_LARGE', message: 'Image must be ≤ 2 MB' } });
  }

  // Detect mime type from data URI or default to jpeg
  let mimeType = 'image/jpeg';
  const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
  if (mimeMatch) mimeType = mimeMatch[1];

  try {
    const result = await extractIdCard(buffer, mimeType);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: { code: err.code || 'OCR_ERROR', message: err.message },
    });
  }
});

/**
 * POST /api/ctv/signup
 * Body: {
 *   phone, name, email, dob, address, idNumber, password,
 *   referrerPhone?, signatureImage?, signupTermsId?
 * }
 * Creates CTV partner in BOTH dental and cosmetic DBs.
 */
router.post('/signup', async (req, res) => {
  try {
    const {
      phone, name, email, dob, address, idNumber, password,
      referrerPhone, signatureImage, signupTermsId,
    } = req.body || {};

    // Validation
    if (!phone || !name || !password) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'phone, name, and password are required' },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'password must be at least 6 characters' },
      });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Invalid phone number' },
      });
    }

    const dentalDb = getDb('dental');
    const cosmeticDb = getDb('cosmetic');

    // Check for existing phone in either DB
    const existingSql = `
      SELECT id FROM dbo.partners
      WHERE phone = $1 AND isdeleted = false
      LIMIT 1
    `;
    const [dExisting, cExisting] = await Promise.all([
      dentalDb.queryRows(existingSql, [normalizedPhone]),
      cosmeticDb.queryRows(existingSql, [normalizedPhone]),
    ]);
    if (dExisting.length > 0 || cExisting.length > 0) {
      return res.status(409).json({
        error: { code: 'PHONE_EXISTS', message: 'Phone number already registered' },
      });
    }

    // Resolve referrer if provided
    let referrerId = null;
    if (referrerPhone) {
      const refNormalized = normalizePhone(referrerPhone);
      if (refNormalized) {
        const refSql = `
          SELECT id FROM dbo.partners
          WHERE phone = $1 AND is_ctv = true AND active = true AND isdeleted = false
          LIMIT 1
        `;
        const [dRef, cRef] = await Promise.all([
          dentalDb.queryRows(refSql, [refNormalized]),
          cosmeticDb.queryRows(refSql, [refNormalized]),
        ]);
        const refMatch = dRef[0] || cRef[0];
        if (refMatch) referrerId = refMatch.id;
      }
    }

    const passwordHash = await hashPassword(password);

    // Generate a UUID for the new partner (same ID in both DBs)
    const { v4: uuidv4 } = require('uuid');
    const partnerId = uuidv4();

    // Parse DOB into year/month/day if provided
    let birthyear = null, birthmonth = null, birthday = null;
    if (dob && /^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      const [y, m, d] = dob.split('-').map(Number);
      birthyear = y;
      birthmonth = m;
      birthday = d;
    }

    const insertSql = `
      INSERT INTO dbo.partners (
        id, name, phone, email, password_hash,
        employee, customer, active, isdeleted,
        supplier, isagent, isinsurance,
        iscompany, ishead, isbusinessinvoice,
        isdoctor, isassistant, isreceptionist,
        is_ctv, created_via, referred_by_ctv_id,
        signature_image, birthyear, birthmonth, birthday,
        personaladdress, personalidentitycard,
        datecreated
      ) VALUES (
        $1, $2, $3, $4, $5,
        true, false, true, false,
        false, false, false,
        false, false, false,
        false, false, false,
        true, 'self_signup', $6,
        $7, $8, $9, $10,
        $11, $12,
        NOW()
      )
    `;

    const params = [
      partnerId,
      name,
      normalizedPhone,
      email || null,
      passwordHash,
      referrerId,
      signatureImage || null,
      birthyear,
      birthmonth,
      birthday,
      address || null,
      idNumber || null,
    ];

    // Insert into both DBs
    try {
      await dentalDb.query(insertSql, params);
    } catch (err) {
      console.error('[ctv/signup] dental insert error:', err);
      return res.status(500).json({ error: { code: 'DB_ERROR', message: 'Failed to create dental partner' } });
    }

    try {
      await cosmeticDb.query(insertSql, params);
    } catch (err) {
      console.error('[ctv/signup] cosmetic insert error:', err);
      // Attempt to rollback dental (best effort)
      try {
        await dentalDb.query('DELETE FROM dbo.partners WHERE id = $1', [partnerId]);
      } catch (rbErr) {
        console.error('[ctv/signup] dental rollback failed:', rbErr);
      }
      return res.status(500).json({ error: { code: 'DB_ERROR', message: 'Failed to create cosmetic partner' } });
    }

    return res.status(201).json({
      success: true,
      id: partnerId,
      message: 'CTV registration successful',
    });
  } catch (err) {
    console.error('[ctv/signup] error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Registration failed' } });
  }
});

module.exports = router;

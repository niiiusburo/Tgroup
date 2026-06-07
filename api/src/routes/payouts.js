'use strict';

/**
 * @crossref:domain[earnings-commissions]
 * @crossref:used-in[NK3 Express API route: api/src/routes/payouts]
 * @crossref:uses[product-map/domains/earnings-commissions.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
/**
 * payouts.js — Admin CTV payout cycles + receipt photo.
 * Mounted at /api/Payouts and /api/cosmetic/Payouts (NK3 mirror).
 * Each payout is scoped to ONE LOB (dental | cosmetic):
 * the payout row and the earnings it settles live in that LOB's database.
 * No cross-DB SQL — the LOB is chosen per request (query/body) and resolves the pool.
 *
 * Routes:
 *   GET    /                  list recent payout cycles for a LOB
 *   POST   /                  create a payout cycle from selected pending earnings
 *   POST   /upload-receipt    upload a receipt image (multipart, field "receipt")
 *   PATCH  /:id               attach/replace a receipt URL on an existing payout
 *
 * @crossref:implements[Gap 1 manual payout cycles + receipt photo]
 * @crossref:used-by[website/src/components/commission/EarningsPayoutsTabs.tsx PayoutsTab]
 * @crossref:endpoint[GET /api/Payouts, POST /api/Payouts, POST /api/Payouts/combined, PATCH /api/Payouts/:id]
 * @crossref:uses[product-map/domains/earnings-commissions.yaml, website/src/components/commission/EarningsPayoutsTabs.tsx]
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { requireAuth } = require('../middleware/auth');
const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');
const { getDb } = require('../db');

const router = express.Router();

const PAYOUT_PERMISSION = 'commissions.payout.run';

// --- helpers --------------------------------------------------------------

function normalizeLob(value) {
  return value === 'dental' || value === 'cosmetic' ? value : null;
}

function parseLimitOffset(query) {
  const limit = Math.min(Math.max(parseInt(query.limit || '50', 10) || 50, 1), 200);
  const offset = Math.max(parseInt(query.offset || '0', 10) || 0, 0);
  return { limit, offset };
}

async function adminOrPayout(employeeId, authLob = 'dental') {
  try {
    const state = await resolveEffectivePermissions(employeeId, authLob);
    const list = (state && state.effectivePermissions) || [];
    return isAdminPermissionState(state) || list.includes('*') || list.includes(PAYOUT_PERMISSION);
  } catch (e) {
    return false;
  }
}

// Express middleware enforcing the payout permission (admin or commissions.payout.run).
async function requirePayoutPermission(req, res, next) {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: { code: 'S_UNAUTHENTICATED', message: 'No token' } });
  if (!(await adminOrPayout(employeeId, req.user?.authLob || 'dental'))) {
    return res.status(403).json({ error: { code: 'S_FORBIDDEN', message: 'Admin or payout permission required' } });
  }
  return next();
}

function mapPayoutRow(row, lob) {
  return {
    id: row.id,
    lob,
    cycle_label: row.cycle_label,
    paid_at: row.paid_at,
    total_amount: parseFloat(row.total_amount || 0),
    notes: row.notes ?? null,
    receipt_url: row.receipt_url ?? null,
    receipt_uploaded_at: row.receipt_uploaded_at ?? null,
    created_by_partner_id: row.created_by_partner_id ?? null,
    created_by_name: row.created_by_name ?? null,
    earnings_count: parseInt(row.earnings_count || 0, 10) || 0,
    created_at: row.created_at,
    // §10: set when this payout is one leg of a combined Dental+Cosmetic payout.
    payout_group_id: row.payout_group_id ?? null,
  };
}

// --- receipt upload (multer + sharp, mirrors feedback/attachments.js) -----

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'payouts');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error(`Invalid file type: ${file.mimetype}`));
  },
});

async function compressImage(file) {
  if (file.mimetype === 'image/gif') return; // preserve animated GIFs
  try {
    const newFilename = `${crypto.randomUUID()}.jpg`;
    const newPath = path.join(UPLOAD_DIR, newFilename);
    await sharp(file.path)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toFile(newPath);
    fs.unlinkSync(file.path);
    file.filename = newFilename;
    file.path = newPath;
  } catch (err) {
    console.error('[Payouts] receipt compression failed, keeping original:', err.message);
  }
}

function uploadReceiptMiddleware(req, res, next) {
  upload.single('receipt')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: { code: 'U_UPLOAD_FAILED', message: err.message } });
    }
    next();
  });
}

// --- routes ---------------------------------------------------------------

// GET /api/Payouts?lob=cosmetic&limit=50&offset=0
router.get('/', requireAuth, requirePayoutPermission, async (req, res) => {
  try {
    // If lob is present but invalid (not 'dental' or 'cosmetic'), return 400.
    // If absent, default to 'cosmetic'.
    if (req.query.lob && !normalizeLob(req.query.lob)) {
      return res.status(400).json({ error: { code: 'U_INVALID_LOB', message: 'lob must be "dental" or "cosmetic"' } });
    }
    const lob = normalizeLob(req.lob) || normalizeLob(req.query.lob) || 'cosmetic';
    const { limit, offset } = parseLimitOffset(req.query);
    const db = getDb(lob);

    const rows = await db.queryRows(`
      SELECT
        p.id, p.cycle_label, p.paid_at, p.total_amount, p.notes,
        p.receipt_url, p.receipt_uploaded_at, p.created_by_partner_id, p.created_at,
        p.payout_group_id,
        creator.name AS created_by_name,
        (SELECT COUNT(*) FROM dbo.earnings e WHERE e.payout_id = p.id) AS earnings_count
      FROM dbo.payouts p
      LEFT JOIN dbo.partners creator ON creator.id = p.created_by_partner_id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countRows = await db.queryRows('SELECT COUNT(*) AS count FROM dbo.payouts', []);
    const totalItems = parseInt(countRows[0]?.count || 0, 10) || 0;

    return res.json({
      items: rows.map((r) => mapPayoutRow(r, lob)),
      totalItems,
      limit,
      offset,
    });
  } catch (err) {
    console.error('[Payouts GET /] error:', err);
    return res.status(500).json({ error: { code: 'E_PAYOUTS_LIST_FAILED', message: 'Failed to fetch payouts' } });
  }
});

// POST /api/Payouts  { lob, earningIds[], cycleLabel, notes?, receipt_url? }
router.post('/', requireAuth, requirePayoutPermission, async (req, res) => {
  const { lob: rawLob, earningIds, cycleLabel, notes, receipt_url: receiptUrl } = req.body || {};
  const lob = normalizeLob(req.lob) || normalizeLob(rawLob);

  if (!lob) {
    return res.status(400).json({ error: { code: 'U_INVALID_LOB', message: 'lob must be "dental" or "cosmetic"' } });
  }
  if (!Array.isArray(earningIds) || earningIds.length === 0) {
    return res.status(400).json({ error: { code: 'U_INVALID_INPUT', message: 'earningIds must be a non-empty array' } });
  }
  if (!cycleLabel || typeof cycleLabel !== 'string' || !cycleLabel.trim()) {
    return res.status(400).json({ error: { code: 'U_INVALID_INPUT', message: 'cycleLabel is required' } });
  }

  const createdBy = req.user.employeeId || req.user.id;
  const client = await getDb(lob).connect();
  try {
    await client.query('BEGIN');

    // Lock the candidate earnings; only 'pending' rows are payable.
    const lockRes = await client.query(
      `SELECT id, amount FROM dbo.earnings WHERE id = ANY($1) AND status = 'pending' FOR UPDATE`,
      [earningIds]
    );
    const payable = lockRes.rows || [];

    if (payable.length !== earningIds.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: {
          code: 'B_EARNINGS_NOT_PAYABLE',
          message: 'Some earnings are not pending (already paid, reversed, or not found)',
          payableCount: payable.length,
          requestedCount: earningIds.length,
        },
      });
    }

    const total = payable.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const uploadedAt = receiptUrl ? new Date() : null;

    const insertRes = await client.query(
      `INSERT INTO dbo.payouts
        (cycle_label, paid_at, total_amount, notes, created_by_partner_id, receipt_url, receipt_uploaded_at)
       VALUES ($1, now(), $2, $3, $4, $5, $6)
       RETURNING id, cycle_label, paid_at, total_amount, notes, receipt_url, receipt_uploaded_at, created_by_partner_id, created_at`,
      [cycleLabel.trim(), total, notes || null, createdBy, receiptUrl || null, uploadedAt]
    );
    const payout = (insertRes.rows || [])[0];

    await client.query(
      `UPDATE dbo.earnings SET status = 'paid', payout_id = $1 WHERE id = ANY($2)`,
      [payout.id, earningIds]
    );

    await client.query('COMMIT');

    return res.status(201).json(mapPayoutRow(
      { ...payout, earnings_count: earningIds.length, created_by_name: req.user.name || null },
      lob
    ));
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('[Payouts POST /] error:', err);
    return res.status(500).json({ error: { code: 'E_PAYOUT_CREATE_FAILED', message: 'Failed to create payout' } });
  } finally {
    client.release();
  }
});

// POST /api/Payouts/combined  — §10 combined payout across Dental + Cosmetic.
// Body: { cycleLabel, notes?, receipt_url?, dental?: [earningIds], cosmetic?: [earningIds] }
// Creates one LOB-local payout row in each DB that has earnings, all sharing the SAME
// payout_group_id and receipt. Each leg is its own transaction; on partial failure the
// succeeded leg(s) are reported under `partial` (admin retries the failed LOB).
router.post('/combined', requireAuth, requirePayoutPermission, async (req, res) => {
  const { cycleLabel, notes, receipt_url: receiptUrl } = req.body || {};
  const legs = {
    dental: Array.isArray(req.body && req.body.dental) ? req.body.dental : [],
    cosmetic: Array.isArray(req.body && req.body.cosmetic) ? req.body.cosmetic : [],
  };
  if (!cycleLabel || typeof cycleLabel !== 'string' || !cycleLabel.trim()) {
    return res.status(400).json({ error: { code: 'U_INVALID_INPUT', message: 'cycleLabel is required' } });
  }
  if (legs.dental.length === 0 && legs.cosmetic.length === 0) {
    return res.status(400).json({ error: { code: 'U_INVALID_INPUT', message: 'at least one of dental/cosmetic earningIds is required' } });
  }

  const createdBy = req.user.employeeId || req.user.id;
  const groupId = crypto.randomUUID();
  const result = { payout_group_id: groupId, dental: null, cosmetic: null };

  async function createLeg(lob, earningIds) {
    const client = await getDb(lob).connect();
    try {
      await client.query('BEGIN');
      const lockRes = await client.query(
        `SELECT id, amount FROM dbo.earnings WHERE id = ANY($1) AND status = 'pending' FOR UPDATE`,
        [earningIds]
      );
      const payable = lockRes.rows || [];
      if (payable.length !== earningIds.length) {
        await client.query('ROLLBACK');
        const e = new Error('not_payable');
        e.code = 'B_EARNINGS_NOT_PAYABLE';
        e.lob = lob;
        e.detail = { payableCount: payable.length, requestedCount: earningIds.length };
        throw e;
      }
      const total = payable.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const uploadedAt = receiptUrl ? new Date() : null;
      const ins = await client.query(
        `INSERT INTO dbo.payouts
          (cycle_label, paid_at, total_amount, notes, created_by_partner_id, receipt_url, receipt_uploaded_at, payout_group_id)
         VALUES ($1, now(), $2, $3, $4, $5, $6, $7)
         RETURNING id, cycle_label, paid_at, total_amount, notes, receipt_url, receipt_uploaded_at, created_by_partner_id, created_at, payout_group_id`,
        [cycleLabel.trim(), total, notes || null, createdBy, receiptUrl || null, uploadedAt, groupId]
      );
      const payout = (ins.rows || [])[0];
      await client.query(`UPDATE dbo.earnings SET status = 'paid', payout_id = $1 WHERE id = ANY($2)`, [payout.id, earningIds]);
      await client.query('COMMIT');
      return mapPayoutRow({ ...payout, earnings_count: earningIds.length, created_by_name: req.user.name || null }, lob);
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  }

  try {
    if (legs.dental.length > 0) result.dental = await createLeg('dental', legs.dental);
    if (legs.cosmetic.length > 0) result.cosmetic = await createLeg('cosmetic', legs.cosmetic);
    return res.status(201).json(result);
  } catch (err) {
    if (err && err.code === 'B_EARNINGS_NOT_PAYABLE') {
      return res.status(409).json({
        error: { code: err.code, message: 'Some earnings are not pending (already paid, reversed, or not found)', lob: err.lob, ...err.detail },
        partial: result,
      });
    }
    console.error('[Payouts POST /combined] error:', err);
    return res.status(500).json({ error: { code: 'E_PAYOUT_CREATE_FAILED', message: 'Failed to create combined payout' }, partial: result });
  }
});

// POST /api/Payouts/upload-receipt  (multipart, field "receipt")  -> { url }
router.post('/upload-receipt', requireAuth, requirePayoutPermission, uploadReceiptMiddleware, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: { code: 'U_MISSING_FILE', message: 'No receipt file uploaded' } });
  }
  try {
    await compressImage(req.file);
    return res.json({ url: `/uploads/payouts/${req.file.filename}` });
  } catch (err) {
    console.error('[Payouts upload-receipt] error:', err);
    return res.status(500).json({ error: { code: 'E_RECEIPT_UPLOAD_FAILED', message: 'Failed to store receipt' } });
  }
});

// PATCH /api/Payouts/:id  { receipt_url, lob? }
router.patch('/:id', requireAuth, requirePayoutPermission, async (req, res) => {
  const { id } = req.params;
  const { receipt_url: receiptUrl, lob: rawLob } = req.body || {};
  // If lob is present but invalid (not 'dental' or 'cosmetic'), return 400.
  // If absent, default to 'cosmetic'.
  if (rawLob && !normalizeLob(rawLob)) {
    return res.status(400).json({ error: { code: 'U_INVALID_LOB', message: 'lob must be "dental" or "cosmetic"' } });
  }
  const lob = normalizeLob(req.lob) || normalizeLob(rawLob) || 'cosmetic';

  if (!receiptUrl || typeof receiptUrl !== 'string') {
    return res.status(400).json({ error: { code: 'U_INVALID_INPUT', message: 'receipt_url is required' } });
  }

  try {
    const db = getDb(lob);
    const rows = await db.queryRows(
      `UPDATE dbo.payouts
         SET receipt_url = $1, receipt_uploaded_at = now()
       WHERE id = $2
       RETURNING id, cycle_label, paid_at, total_amount, notes, receipt_url, receipt_uploaded_at, created_by_partner_id, created_at,
         (SELECT COUNT(*) FROM dbo.earnings e WHERE e.payout_id = dbo.payouts.id) AS earnings_count`,
      [receiptUrl, id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: { code: 'S_NOT_FOUND', message: 'Payout not found' } });
    }

    return res.json(mapPayoutRow(rows[0], lob));
  } catch (err) {
    console.error('[Payouts PATCH /:id] error:', err);
    return res.status(500).json({ error: { code: 'E_PAYOUT_UPDATE_FAILED', message: 'Failed to update payout' } });
  }
});

module.exports = router;

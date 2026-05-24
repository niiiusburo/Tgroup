'use strict';

/**
 * payouts.js — Admin payout batch runner for CTV/MLM commissions.
 * Mounted at /api/Payouts. Payouts are per physical LOB DB; callers may run
 * dental and cosmetic batches separately to keep two-DB isolation explicit.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');
const { getDb } = require('../db');

const router = express.Router();

function toRows(result) {
  if (Array.isArray(result)) return result;
  if (result && result.rows) return result.rows;
  return [];
}

async function queryRows(clientOrPool, sql, params = []) {
  if (typeof clientOrPool.queryRows === 'function') return clientOrPool.queryRows(sql, params);
  return toRows(await clientOrPool.query(sql, params));
}

function normalizeLob(raw) {
  return raw === 'cosmetic' ? 'cosmetic' : 'dental';
}

async function adminOrPerm(employeeId, perm) {
  try {
    const state = await resolveEffectivePermissions(employeeId);
    const list = (state && state.effectivePermissions) || [];
    return isAdminPermissionState(state) || list.includes('*') || list.includes(perm);
  } catch (e) {
    return false;
  }
}

async function listPayouts(lob, { limit, offset }) {
  const db = getDb(lob);
  const rows = await queryRows(db, `
    SELECT p.id, p.cycle_label, p.paid_at, p.total_amount, p.notes,
           p.receipt_url, p.receipt_uploaded_at,
           p.created_by_partner_id, creator.name AS created_by_name, p.created_at,
           COUNT(e.id) AS earnings_count
    FROM dbo.payouts p
    LEFT JOIN dbo.partners creator ON creator.id = p.created_by_partner_id
    LEFT JOIN dbo.earnings e ON e.payout_id = p.id
    GROUP BY p.id, creator.name
    ORDER BY COALESCE(p.paid_at, p.created_at) DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);
  const countRows = await queryRows(db, 'SELECT COUNT(*) AS count FROM dbo.payouts');
  return {
    rows: rows.map((row) => ({
      ...row,
      lob,
      total_amount: parseFloat(row.total_amount || 0),
      earnings_count: parseInt(row.earnings_count || 0, 10),
    })),
    count: parseInt(countRows[0]?.count || '0', 10),
  };
}

router.get('/', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  if (!(await adminOrPerm(employeeId, 'commissions.payout.run'))) {
    return res.status(403).json({ error: { code: 'S_FORBIDDEN', message: 'Admin only' } });
  }

  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset || '0', 10) || 0, 0);
    const lob = req.query.lob === 'dental' || req.query.lob === 'cosmetic' ? req.query.lob : 'all';
    const lobs = lob === 'all' ? ['dental', 'cosmetic'] : [lob];
    const parts = await Promise.all(lobs.map((l) => listPayouts(l, { limit, offset })));
    const items = parts.flatMap((p) => p.rows)
      .sort((a, b) => new Date(b.paid_at || b.created_at || 0) - new Date(a.paid_at || a.created_at || 0))
      .slice(0, limit);
    return res.json({ items, totalItems: parts.reduce((sum, p) => sum + p.count, 0), limit, offset });
  } catch (err) {
    console.error('[Payouts GET /] error:', err);
    return res.status(500).json({ error: 'Failed to fetch payouts' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  if (!(await adminOrPerm(employeeId, 'commissions.payout.run'))) {
    return res.status(403).json({ error: { code: 'S_FORBIDDEN', message: 'Admin only' } });
  }

  const lob = normalizeLob(req.body?.lob);
  const earningIds = Array.isArray(req.body?.earningIds) ? req.body.earningIds : req.body?.earning_ids;
  const cycleLabel = String(req.body?.cycleLabel || req.body?.cycle_label || '').trim();
  const notes = req.body?.notes || null;
  const receiptUrl = req.body?.receipt_url || null;
  const createdBy = req.user?.employeeId || null;

  if (!Array.isArray(earningIds) || earningIds.length === 0) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'earningIds must be a non-empty array' } });
  }
  if (!cycleLabel) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'cycleLabel is required' } });
  }

  const pool = getDb(lob);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const pending = await queryRows(client, `
      SELECT id, amount
      FROM dbo.earnings
      WHERE id = ANY($1) AND status = 'pending' AND payout_id IS NULL
      FOR UPDATE
    `, [earningIds]);

    if (pending.length !== earningIds.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: { code: 'B_EARNINGS_NOT_PAYABLE', message: 'Some earnings are missing, already paid, or not pending' } });
    }

    const total = pending.reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);
    const payoutRows = await queryRows(client, `
      INSERT INTO dbo.payouts (cycle_label, paid_at, total_amount, notes, receipt_url, created_by_partner_id)
      VALUES ($1, now(), $2, $3, $4, $5)
      RETURNING id, cycle_label, paid_at, total_amount, notes, receipt_url, created_by_partner_id, created_at
    `, [cycleLabel, total, notes, receiptUrl, createdBy]);
    const payout = payoutRows[0];

    await client.query(
      `UPDATE dbo.earnings SET status = 'paid', payout_id = $1 WHERE id = ANY($2)`,
      [payout.id, earningIds],
    );

    await client.query('COMMIT');
    return res.status(201).json({
      ...payout,
      lob,
      total_amount: parseFloat(payout.total_amount || 0),
      earnings_count: pending.length,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Payouts POST /] error:', err);
    return res.status(500).json({ error: 'Failed to create payout' });
  } finally {
    client.release();
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  if (!(await adminOrPerm(employeeId, 'commissions.payout.run'))) {
    return res.status(403).json({ error: { code: 'S_FORBIDDEN', message: 'Admin only' } });
  }

  const { id } = req.params;
  const { receipt_url } = req.body || {};
  if (!receipt_url || typeof receipt_url !== 'string') {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'receipt_url is required' } });
  }

  const lob = normalizeLob(req.body?.lob);
  const db = getDb(lob);
  try {
    const rows = await queryRows(db, `
      UPDATE dbo.payouts
      SET receipt_url = $1, receipt_uploaded_at = now()
      WHERE id = $2
      RETURNING id, cycle_label, paid_at, total_amount, notes, receipt_url, receipt_uploaded_at, created_by_partner_id, created_at
    `, [receipt_url, id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: { code: 'S_NOT_FOUND', message: 'Payout not found' } });
    }
    return res.json({
      ...rows[0],
      lob,
      total_amount: parseFloat(rows[0].total_amount || 0),
    });
  } catch (err) {
    console.error('[Payouts PATCH /:id] error:', err);
    return res.status(500).json({ error: 'Failed to update payout receipt' });
  }
});

// ─── Receipt upload (reuses multer + local disk pattern from feedback/attachments) ───
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'payouts');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

router.post('/upload-receipt', requireAuth, upload.single('receipt'), async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  if (!(await adminOrPerm(employeeId, 'commissions.payout.run'))) {
    return res.status(403).json({ error: { code: 'S_FORBIDDEN', message: 'Admin only' } });
  }

  if (!req.file) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'receipt file is required' } });
  }

  const url = `/uploads/payouts/${req.file.filename}`;
  return res.json({ url });
});

module.exports = router;

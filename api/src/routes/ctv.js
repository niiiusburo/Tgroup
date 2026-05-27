'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getDb } = require('../db');
const { safeQueryRows } = require('./ctvHelpers');
const { getClientJourneys } = require('./ctvClientJourneys');
const { createCtv, referClient, getNetwork, createBooking } = require('./ctvActions');

const router = express.Router();

function parseMoney(value) {
  const amount = parseFloat(value || 0);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

function mapServiceRow(row, lob) {
  return {
    id: row.id,
    serviceLineId: row.service_line_id || null,
    paymentId: row.payment_id || null,
    serviceName: row.service_name || 'Dịch vụ',
    amount: parseMoney(row.amount),
    status: row.status || 'pending',
    source: row.source || 'ctv',
    lob,
    earnedAt: row.earned_at || row.created_at || null,
  };
}

async function getReferralServices(db, clientId, ctvId, lob) {
  const rows = await safeQueryRows(
    db,
    `SELECT
       e.id,
       e.service_line_id,
       e.payment_id,
       e.amount,
       e.status,
       e.source,
       e.earned_at,
       e.created_at,
       COALESCE(NULLIF(sol.productname, ''), pr.name, NULLIF(sol.name, ''), 'Dịch vụ') AS service_name
     FROM dbo.earnings e
     LEFT JOIN dbo.saleorderlines sol ON sol.id = e.service_line_id
     LEFT JOIN dbo.products pr ON pr.id = sol.productid
     WHERE e.client_id = $1
       AND e.recipient_partner_id = $2
     ORDER BY COALESCE(e.earned_at, e.created_at) DESC
     LIMIT 50`,
    [clientId, ctvId]
  );

  return rows.map((row) => mapServiceRow(row, lob));
}

router.get('/commission-summary', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  const earningsSql = `
    SELECT e.id, e.client_id, e.recipient_partner_id, e.payment_id, e.service_line_id,
           e.source, e.amount, e.status, e.payout_id, e.earned_at, e.created_at,
           COALESCE(p.name, 'Unknown Client') AS client_name,
           COALESCE(NULLIF(sol.productname, ''), pr.name, NULLIF(sol.name, ''), 'Dịch vụ') AS service_name
    FROM dbo.earnings e
    LEFT JOIN dbo.partners p ON p.id = e.client_id
    LEFT JOIN dbo.saleorderlines sol ON sol.id = e.service_line_id
    LEFT JOIN dbo.products pr ON pr.id = sol.productid
    WHERE e.recipient_partner_id = $1
    ORDER BY COALESCE(e.earned_at, e.created_at) DESC
    LIMIT 100
  `;
  const dentalDb = getDb('dental');
  const cosmeticDb = getDb('cosmetic');
  const [dRows, cRows] = await Promise.all([
    safeQueryRows(dentalDb, earningsSql, [employeeId]),
    safeQueryRows(cosmeticDb, earningsSql, [employeeId]),
  ]);
  const all = [
    ...dRows.map((row) => ({ ...row, lob: 'dental' })),
    ...cRows.map((row) => ({ ...row, lob: 'cosmetic' })),
  ].sort((a, b) => {
    const ta = new Date(a.earned_at || a.created_at || 0).getTime();
    const tb = new Date(b.earned_at || b.created_at || 0).getTime();
    return tb - ta;
  });

  let pendingTotal = 0;
  let paidTotal = 0;
  let dentalPending = 0;
  let cosmeticPending = 0;
  let pendingCount = 0;
  let paidCount = 0;

  all.forEach((earning) => {
    const amount = parseFloat(earning.amount || 0);
    const isPaid = earning.status === 'paid' || !!earning.payout_id;
    if (isPaid) {
      paidTotal += Math.abs(amount);
      paidCount += 1;
      return;
    }
    if (earning.status === 'pending' && amount > 0) {
      pendingTotal += amount;
      pendingCount += 1;
      if (earning.lob === 'dental') dentalPending += amount;
      else cosmeticPending += amount;
    }
  });

  const recent = all.slice(0, 8).map((earning) => ({
    id: earning.id,
    client_id: earning.client_id,
    client_name: earning.client_name,
    service_line_id: earning.service_line_id || null,
    service_name: earning.service_name || 'Dịch vụ',
    payment_id: earning.payment_id || null,
    amount: parseFloat(earning.amount || 0),
    source: earning.source || 'ctv',
    lob: earning.lob,
    earned_at: earning.earned_at || earning.created_at,
    status: earning.status,
  }));
  const dPayoutIds = [...new Set(dRows.map((row) => row.payout_id).filter(Boolean))];
  const cPayoutIds = [...new Set(cRows.map((row) => row.payout_id).filter(Boolean))];
  const [dPayouts, cPayouts] = await Promise.all([
    dPayoutIds.length > 0
      ? safeQueryRows(dentalDb, 'SELECT id, cycle_label, paid_at, total_amount, receipt_url FROM dbo.payouts WHERE id = ANY($1)', [dPayoutIds])
      : Promise.resolve([]),
    cPayoutIds.length > 0
      ? safeQueryRows(cosmeticDb, 'SELECT id, cycle_label, paid_at, total_amount, receipt_url FROM dbo.payouts WHERE id = ANY($1)', [cPayoutIds])
      : Promise.resolve([]),
  ]);
  const payouts = [
    ...dPayouts.map((payout) => ({ ...payout, lob: 'dental', total_amount: parseFloat(payout.total_amount || 0) })),
    ...cPayouts.map((payout) => ({ ...payout, lob: 'cosmetic', total_amount: parseFloat(payout.total_amount || 0) })),
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
    pendingList: recent.filter((row) => row.status === 'pending'),
    paidList: recent.filter((row) => row.status !== 'pending' || parseFloat(row.amount) < 0),
    payouts,
  });
});

router.get('/referrals', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

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
    safeQueryRows(dentalDb, refSql, [employeeId]),
    safeQueryRows(cosmeticDb, refSql, [employeeId]),
  ]);

  const buildReferral = async (db, row, lob) => {
    const earnRows = await safeQueryRows(
      db,
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt
       FROM dbo.earnings
       WHERE client_id = $1 AND recipient_partner_id = $2`,
      [row.id, employeeId]
    );
    const er = earnRows[0] || { total: 0, cnt: 0 };
    const count = parseInt(er.cnt || 0, 10);
    const services = await getReferralServices(db, row.id, employeeId, lob);
    return {
      id: row.id,
      name: row.name,
      phone: row.phone || '',
      lobs: [lob],
      total_earned: Math.round(parseFloat(er.total || 0)),
      earned_count: count,
      service_count: services.length,
      services,
      status: count > 0 ? 'earning' : 'no visit yet',
      referred_at: row.referred_at,
    };
  };

  const dItems = await Promise.all(dRefsRaw.map((row) => buildReferral(dentalDb, row, 'dental')));
  const cItems = await Promise.all(cRefsRaw.map((row) => buildReferral(cosmeticDb, row, 'cosmetic')));
  const byId = new Map();
  [...dItems, ...cItems].forEach((item) => {
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
      return;
    }
    const previous = byId.get(item.id);
    previous.lobs = Array.from(new Set([...previous.lobs, ...item.lobs]));
    previous.total_earned += item.total_earned;
    previous.earned_count += item.earned_count;
    previous.services = [...(previous.services || []), ...(item.services || [])];
    previous.service_count = previous.services.length;
    if (item.status === 'earning') previous.status = 'earning';
  });

  return res.json({ referrals: Array.from(byId.values()) });
});

router.get('/client-journeys', requireAuth, getClientJourneys);

router.get('/me', requireAuth, (req, res) => {
  const user = req.user || {};
  res.json({
    id: user.employeeId,
    name: user.name || 'CTV',
    email: user.email || '',
    phone: '',
    role: 'CTV',
  });
});

router.post('/', requireAuth, createCtv);
router.post('/clients', requireAuth, referClient);
router.get('/network', requireAuth, getNetwork);
router.post('/bookings', requireAuth, createBooking);

module.exports = router;

/**
 * commission.js — earnings/payouts/commission aggregation routes.
 * Extracted from the original ctv.js (pure mechanical split; no logic/SQL changes).
 *
 * Routes mounted under /api/ctv (see ctv/index.js).
 *
 * @crossref:endpoint[GET /api/ctv/commission-summary]
 * @crossref:domain[ctv, earnings-commissions]
 * @crossref:uses[api/src/db.js (getDb dual), api/src/services/ctvCommissionAttribution.js, api/src/routes/ctv/_shared.js]
 */
const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { getDb } = require('../../db');
const { safeQueryRows, requireCtvUser } = require('./_shared');

const router = express.Router();

/**
 * GET /api/ctv/commission-summary
 * Live aggregation across both LOB DBs for this CTV (by recipient_partner_id = employeeId from JWT).
 * Returns shape consumable by CtvDashboard (totals with per-LOB pending, recent with client_name + lob pills, lists).
 */
router.get('/commission-summary', requireAuth, requireCtvUser, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  const ctvId = employeeId;

  const earningsSql = `
    SELECT e.id, e.client_id, e.recipient_partner_id, e.payment_id, e.service_line_id,
           e.source, e.level, e.amount, e.status, e.payout_id, e.earned_at, e.created_at,
           p.name AS client_name,
           p.referred_by_ctv_id AS client_referred_by_ctv_id,
           sol.productname AS service_name
    FROM dbo.earnings e
    LEFT JOIN dbo.partners p ON p.id = e.client_id
    LEFT JOIN dbo.saleorderlines sol ON sol.id = e.service_line_id
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

  const { enrichCommissionAttribution, mapCommissionApiRow } = require('../../services/ctvCommissionAttribution');
  const enriched = await enrichCommissionAttribution(all, ctvId, {
    dentalDb,
    cosmeticDb,
    safeQueryRows,
  });
  const mapEarningRow = mapCommissionApiRow;

  const recent = enriched.slice(0, 8).map(mapEarningRow);
  // Pending tab shows ALL pending rows including negative reversals (INV-003A:
  // reversal rows are audit-visible; the CTV must see upcoming deductions).
  // Regression guard: ctvBookings.test.js "does not list pending reversals ... in the Paid tab".
  const pendingList = enriched
    .filter((e) => e.status === 'pending')
    .slice(0, 50)
    .map(mapEarningRow);
  // Paid = actually paid out (matches the aggregation's isPaid). This deliberately
  // EXCLUDES 'pending' reversals and INV-003C service-card 'reversed' rows, neither of
  // which are paid earnings.
  const paidList = enriched
    .filter((e) => e.status === 'paid' || !!e.payout_id)
    .slice(0, 50)
    .map(mapEarningRow);

  // Fetch payout cycles referenced by this CTV's earnings (for Paid tab grouping)
  const dPayoutIds = [...new Set(dRows.map((r) => r.payout_id).filter(Boolean))];
  const cPayoutIds = [...new Set(cRows.map((r) => r.payout_id).filter(Boolean))];
  const [dPayouts, cPayouts] = await Promise.all([
    dPayoutIds.length > 0
      ? safeQueryRows(dentalDb, `SELECT id, cycle_label, paid_at, total_amount, receipt_url FROM dbo.payouts WHERE id = ANY($1)`, [dPayoutIds])
      : Promise.resolve([]),
    cPayoutIds.length > 0
      ? safeQueryRows(cosmeticDb, `SELECT id, cycle_label, paid_at, total_amount, receipt_url FROM dbo.payouts WHERE id = ANY($1)`, [cPayoutIds])
      : Promise.resolve([]),
  ]);
  const payouts = [
    ...dPayouts.map((p) => ({ ...p, lob: 'dental', total_amount: parseFloat(p.total_amount || 0) })),
    ...cPayouts.map((p) => ({ ...p, lob: 'cosmetic', total_amount: parseFloat(p.total_amount || 0) })),
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
    pendingList,
    paidList,
    payouts,
  });
});

module.exports = router;

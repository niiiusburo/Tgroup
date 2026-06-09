'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[NK3 Express API route: api/src/routes/ctvClientJourneys]
 * @crossref:uses[product-map/domains/ctv.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
const { getDb } = require('../db');
const { safeQueryRows } = require('./ctvHelpers');

async function getClientJourneys(req, res) {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  const ctvId = employeeId;
  const dentalDb = getDb('dental');
  const cosmeticDb = getDb('cosmetic');
  const refSql = `
    SELECT id, name, phone, email, datecreated AS referred_at
    FROM dbo.partners
    WHERE referred_by_ctv_id = $1
      AND (customer = true OR active = true OR employee = false)
    ORDER BY datecreated DESC NULLS LAST
    LIMIT 50
  `;

  try {
    const [dRefsRaw, cRefsRaw] = await Promise.all([
      safeQueryRows(dentalDb, refSql, [ctvId]),
      safeQueryRows(cosmeticDb, refSql, [ctvId]),
    ]);

    const buildJourney = async (db, row, lob) => {
      const earnRows = await safeQueryRows(
        db,
        `SELECT amount, status, payout_id, service_line_id, earned_at, created_at,
                COALESCE(source, 'unknown') AS source
         FROM dbo.earnings
         WHERE client_id = $1 AND recipient_partner_id = $2
         ORDER BY COALESCE(earned_at, created_at) DESC`,
        [row.id, ctvId]
      );

      const totalEarned = earnRows.reduce((sum, e) => sum + Math.abs(parseFloat(e.amount || 0)), 0);
      const paidEarnings = earnRows.filter((e) => e.status === 'paid' || !!e.payout_id);
      const hasService = earnRows.some((e) => e.service_line_id);
      let stage = 'referred';
      let stageProgress = 1;

      if (paidEarnings.length > 0) {
        stage = 'paid';
        stageProgress = 4;
      } else if (hasService) {
        stage = 'serviced';
        stageProgress = 3;
      } else if (earnRows.length > 0) {
        stage = 'visited';
        stageProgress = 2;
      }

      const firstEarn = earnRows[earnRows.length - 1];
      const lastEarn = earnRows[0];
      return {
        id: row.id,
        name: row.name,
        phone: row.phone || '',
        lobs: [lob],
        referred_at: row.referred_at,
        referred_via: firstEarn?.source || 'direct',
        stage,
        stage_progress: stageProgress,
        visit: earnRows.length > 0 ? { date: firstEarn?.earned_at || firstEarn?.created_at || row.referred_at } : undefined,
        service: hasService && lastEarn ? {
          name: lastEarn.source || 'Service',
          amount: Math.abs(parseFloat(lastEarn.amount || 0)),
          date: lastEarn.earned_at || lastEarn.created_at,
        } : undefined,
        payment: paidEarnings.length > 0 ? {
          amount: paidEarnings.reduce((sum, e) => sum + Math.abs(parseFloat(e.amount || 0)), 0),
          date: paidEarnings[0]?.earned_at || paidEarnings[0]?.created_at,
          commission_earned: paidEarnings.reduce((sum, e) => sum + Math.abs(parseFloat(e.amount || 0)), 0),
        } : undefined,
        total_earned: Math.round(totalEarned),
        estimated_commission: Math.round(totalEarned),
      };
    };

    const dItems = await Promise.all(dRefsRaw.map((row) => buildJourney(dentalDb, row, 'dental')));
    const cItems = await Promise.all(cRefsRaw.map((row) => buildJourney(cosmeticDb, row, 'cosmetic')));
    const byId = new Map();

    [...dItems, ...cItems].forEach((item) => {
      if (!byId.has(item.id)) {
        byId.set(item.id, item);
        return;
      }

      const previous = byId.get(item.id);
      previous.lobs = Array.from(new Set([...previous.lobs, ...item.lobs]));
      previous.total_earned += item.total_earned;
      previous.estimated_commission += item.estimated_commission;
      if (item.stage_progress > previous.stage_progress) {
        previous.stage = item.stage;
        previous.stage_progress = item.stage_progress;
        if (item.visit) previous.visit = item.visit;
        if (item.service) previous.service = item.service;
        if (item.payment) previous.payment = item.payment;
      }
    });

    return res.json({ clients: Array.from(byId.values()) });
  } catch (err) {
    console.error('[ctv GET /client-journeys] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getClientJourneys };

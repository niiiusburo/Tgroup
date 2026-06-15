'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[api/src/routes/ctv.js GET /referrals]
 * @crossref:uses[api/src/services/referralClaim.js (computeCtvLink), product-map/domains/ctv.yaml, docs/superpowers/specs/2026-06-15-ctv-portal-tracking-vs-overview-workflow.md]
 *
 * Theo dõi: appointments.ctv_id ∪ saleorders.ctv_id (operational cards with CTV attached).
 * Flip-card service rows = viewer earnings only (recipient_partner_id = viewer) — never another CTV's cards.
 * Commission (earnings) is service-card only — partners.referred_by_ctv_id never grants money.
 * computeCtvLink uses latest appointment OR service card to own the client + reset 6-month window.
 * Claim windows are per LOB — dental lock does not affect cosmetic and vice versa.
 */

const { computeCtvLink } = require('./referralClaim');

function normalizeId(id) {
  return String(id ?? '').trim().toLowerCase();
}

function buildLobLinkSnapshot(item) {
  const lob = item.lobs[0];
  return {
    lob,
    link_expires_at: item.link_expires_at ?? null,
    link_anchor_at: item.link_anchor_at ?? null,
    link_active: item.link_active ?? false,
    eligible: item.eligible ?? false,
    linked_ctv_id: item.linked_ctv_id ?? null,
    linked_ctv_name: item.linked_ctv_name ?? null,
    stage: item.stage,
    stage_progress: item.stage_progress,
  };
}

const CARD_CLIENTS_SQL = `
  WITH card_clients AS (
    SELECT a.partnerid AS id, COALESCE(a.date, a.datecreated) AS card_at
      FROM dbo.appointments a
     WHERE a.ctv_id = $1
       AND COALESCE(a.state, '') NOT ILIKE 'cancel%'
    UNION ALL
    SELECT so.partnerid, COALESCE(so.dateordered, so.datecreated)
      FROM dbo.saleorders so
     WHERE so.ctv_id = $1
       AND COALESCE(so.state, '') NOT ILIKE 'cancel%'
       AND COALESCE(so.isdeleted, false) = false
  ),
  agg AS (
    SELECT id, MIN(card_at) AS first_card_at
      FROM card_clients
     GROUP BY id
  )
  SELECT p.id, p.name, p.phone, p.email, agg.first_card_at AS referred_at
    FROM agg
    JOIN dbo.partners p ON p.id = agg.id
   WHERE COALESCE(p.is_ctv, false) = false
   ORDER BY agg.first_card_at DESC NULLS LAST
   LIMIT 50
`;

/**
 * @param {import('../db').DbLike} db
 * @param {string} ctvId
 * @param {(db: unknown, sql: string, params?: unknown[]) => Promise<object[]>} safeQueryRows
 */
async function discoverCardClientsForLob(db, ctvId, safeQueryRows) {
  return safeQueryRows(db, CARD_CLIENTS_SQL, [ctvId]);
}

/**
 * @param {object[]} dItems
 * @param {object[]} cItems
 */
function mergeReferralsAcrossLobs(dItems, cItems) {
  const byId = new Map();
  [...dItems, ...cItems].forEach((item) => {
    const lobKey = item.lobs[0];
    const lobLink = buildLobLinkSnapshot(item);

    if (byId.has(item.id)) {
      const prev = byId.get(item.id);
      prev.lobs = Array.from(new Set([...prev.lobs, ...item.lobs]));
      prev.lob_links = { ...prev.lob_links, [lobKey]: lobLink };
      prev.total_earned += item.total_earned;
      prev.earned_count += item.earned_count;
      prev.services = [...prev.services, ...item.services];
      prev.service_count = prev.services.length;
      if (item.stage_progress > prev.stage_progress) {
        prev.stage = item.stage;
        prev.stage_progress = item.stage_progress;
      }
      if (item.status === 'earning') prev.status = 'earning';
      else if (item.status === 'paid' && prev.status !== 'earning') prev.status = 'paid';
      if (item.last_payment_at && (!prev.last_payment_at || new Date(item.last_payment_at) > new Date(prev.last_payment_at))) {
        prev.last_payment_at = item.last_payment_at;
      }
      syncTopLevelLinkFields(prev);
    } else {
      byId.set(item.id, {
        ...item,
        lob_links: { [lobKey]: lobLink },
      });
      syncTopLevelLinkFields(byId.get(item.id));
    }
  });
  return Array.from(byId.values());
}

/** Top-level link_* mirrors a single LOB only; multi-LOB rows use lob_links per side. */
function syncTopLevelLinkFields(row) {
  const links = row.lob_links || {};
  const keys = Object.keys(links);
  if (keys.length !== 1) {
    row.link_expires_at = null;
    row.link_anchor_at = null;
    row.link_active = undefined;
    row.eligible = undefined;
    row.linked_ctv_id = null;
    row.linked_ctv_name = null;
    return;
  }
  const only = links[keys[0]];
  row.link_expires_at = only.link_expires_at;
  row.link_anchor_at = only.link_anchor_at;
  row.link_active = only.link_active;
  row.eligible = only.eligible;
  row.linked_ctv_id = only.linked_ctv_id;
  row.linked_ctv_name = only.linked_ctv_name;
}

/**
 * @param {import('../db').DbLike} db
 * @param {object[]} rows partner rows from discoverCardClientsForLob
 * @param {string} ctvId logged-in CTV
 * @param {'dental'|'cosmetic'} lob
 * @param {(db: unknown, sql: string, params?: unknown[]) => Promise<object[]>} safeQueryRows
 */
async function buildCardTrackingReferralsForLob(db, rows, ctvId, lob, safeQueryRows) {
  if (!rows || rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [earnAgg, payAgg, svcRows, visitAgg, apptCtvRows, svcCtvRows, earnDetailRows] = await Promise.all([
    safeQueryRows(
      db,
      `SELECT client_id AS id, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt
         FROM dbo.earnings WHERE client_id = ANY($1) AND recipient_partner_id = $2
        GROUP BY client_id`,
      [ids, ctvId]
    ),
    safeQueryRows(
      db,
      `SELECT so.partnerid AS id, COALESCE(SUM(p.amount), 0) AS total, COUNT(*) AS cnt, MAX(p.payment_date) AS last_at
         FROM payments p
         JOIN dbo.saleorders so ON so.partnerid = p.customer_id
        WHERE so.partnerid = ANY($1) AND so.ctv_id = $2 AND p.amount > 0
          AND COALESCE(so.state, '') NOT ILIKE 'cancel%'
          AND COALESCE(so.isdeleted, false) = false
        GROUP BY so.partnerid`,
      [ids, ctvId]
    ),
    safeQueryRows(
      db,
      `SELECT so.partnerid AS id, sol.id AS line_id, sol.productname AS name,
              sol.pricetotal AS amount, sol.date AS dt, sol.amountresidual AS residual
         FROM dbo.saleorderlines sol
         JOIN dbo.saleorders so ON so.id = sol.orderid
        WHERE so.partnerid = ANY($1) AND so.ctv_id = $2 AND sol.isdeleted = false
        ORDER BY sol.date DESC NULLS LAST`,
      [ids, ctvId]
    ),
    safeQueryRows(
      db,
      `SELECT partnerid AS id, COUNT(*) AS cnt, MAX(date) AS last_at
         FROM appointments WHERE partnerid = ANY($1) AND ctv_id = $2
           AND state IN ('completed','done','arrived')
        GROUP BY partnerid`,
      [ids, ctvId]
    ),
    safeQueryRows(
      db,
      `SELECT DISTINCT ON (a.partnerid) a.partnerid AS id, a.ctv_id AS "ctvId",
              ctvp.name AS "ctvName", COALESCE(a.date, a.datecreated) AS dt
         FROM dbo.appointments a
         LEFT JOIN dbo.partners ctvp ON ctvp.id = a.ctv_id
        WHERE a.partnerid = ANY($1) AND a.ctv_id IS NOT NULL
          AND COALESCE(a.state, '') NOT ILIKE 'cancel%'
        ORDER BY a.partnerid, COALESCE(a.date, a.datecreated) DESC NULLS LAST`,
      [ids]
    ),
    safeQueryRows(
      db,
      `SELECT DISTINCT ON (so.partnerid) so.partnerid AS id, so.ctv_id AS "ctvId",
              ctvp.name AS "ctvName", COALESCE(so.dateordered, so.datecreated) AS dt
         FROM dbo.saleorders so
         LEFT JOIN dbo.partners ctvp ON ctvp.id = so.ctv_id
        WHERE so.partnerid = ANY($1) AND so.ctv_id IS NOT NULL
          AND COALESCE(so.state, '') NOT ILIKE 'cancel%'
          AND COALESCE(so.isdeleted, false) = false
        ORDER BY so.partnerid, COALESCE(so.dateordered, so.datecreated) DESC NULLS LAST`,
      [ids]
    ),
    safeQueryRows(
      db,
      `SELECT e.client_id AS id, e.id AS earning_id, e.service_line_id AS line_id,
              sol.productname AS name, e.amount, e.status, e.earned_at, e.payment_id
         FROM dbo.earnings e
         LEFT JOIN dbo.saleorderlines sol ON sol.id = e.service_line_id
        WHERE e.client_id = ANY($1) AND e.recipient_partner_id = $2
        ORDER BY e.earned_at DESC NULLS LAST, e.created_at DESC NULLS LAST`,
      [ids, ctvId]
    ),
  ]);

  const earnMap = new Map(earnAgg.map((r) => [r.id, r]));
  const payMap = new Map(payAgg.map((r) => [r.id, r]));
  const visitMap = new Map(visitAgg.map((r) => [r.id, r]));
  const svcMap = new Map();
  for (const s of svcRows) {
    if (!svcMap.has(s.id)) svcMap.set(s.id, []);
    svcMap.get(s.id).push(s);
  }
  const earnSvcMap = new Map();
  for (const s of earnDetailRows) {
    if (!earnSvcMap.has(s.id)) earnSvcMap.set(s.id, []);
    earnSvcMap.get(s.id).push(s);
  }

  const apptCtvMap = new Map(apptCtvRows.map((r) => [r.id, r]));
  const svcCtvMap = new Map(svcCtvRows.map((r) => [r.id, r]));

  const items = [];
  for (const row of rows) {
    const link = computeCtvLink({
      appt: apptCtvMap.get(row.id) || null,
      service: svcCtvMap.get(row.id) || null,
    });
    if (normalizeId(link.linkedCtvId) !== normalizeId(ctvId)) continue;

    const e = earnMap.get(row.id) || { total: 0, cnt: 0 };
    const p = payMap.get(row.id);
    const v = visitMap.get(row.id);
    const svc = svcMap.get(row.id) || [];
    const earnSvc = earnSvcMap.get(row.id) || [];

    const hasPaid = !!p && parseInt(p.cnt, 10) > 0;
    const hasService = svc.length > 0;
    const hasVisited = !!v && parseInt(v.cnt, 10) > 0;

    let stage = 'referred';
    let stageProgress = 1;
    if (hasPaid) { stage = 'paid'; stageProgress = 4; }
    else if (hasService) { stage = 'serviced'; stageProgress = 3; }
    else if (hasVisited) { stage = 'visited'; stageProgress = 2; }

    const services = earnSvc.map((s) => ({
      id: s.earning_id || s.line_id,
      serviceLineId: s.line_id || null,
      paymentId: s.payment_id || null,
      serviceName: s.name || null,
      amount: Math.abs(parseFloat(s.amount || 0)),
      status: s.status === 'paid' || s.status === 'reversed' ? s.status : 'pending',
      source: 'ctv',
      lob,
      earnedAt: s.earned_at || null,
    }));

    const total = Math.round(parseFloat(e.total || 0));
    const cnt = parseInt(e.cnt || 0, 10);

    const payload = {
      id: row.id,
      name: row.name,
      phone: row.phone || '',
      lobs: [lob],
      total_earned: total,
      earned_count: cnt,
      status: cnt > 0 ? 'earning' : hasPaid ? 'paid' : 'no visit yet',
      referred_at: row.referred_at,
      stage,
      stage_progress: stageProgress,
      service_count: services.length,
      services,
      last_payment_at: p ? p.last_at : null,
      last_visit_at: v ? v.last_at : null,
      link_expires_at: link.expiresAt ? link.expiresAt.toISOString() : null,
      link_anchor_at: link.anchorAt ? link.anchorAt.toISOString() : null,
      link_active: link.active,
      eligible: link.eligible,
      linked_ctv_id: link.linkedCtvId,
      linked_ctv_name: link.linkedCtvName,
      tracking_source: 'card',
      lob_links: {
        [lob]: {
          lob,
          link_expires_at: link.expiresAt ? link.expiresAt.toISOString() : null,
          link_anchor_at: link.anchorAt ? link.anchorAt.toISOString() : null,
          link_active: link.active,
          eligible: link.eligible,
          linked_ctv_id: link.linkedCtvId,
          linked_ctv_name: link.linkedCtvName,
          stage,
          stage_progress: stageProgress,
        },
      },
    };
    items.push(payload);
  }

  return items;
}

/**
 * @param {string} ctvId
 * @param {{ dentalDb: unknown, cosmeticDb: unknown, safeQueryRows: Function }} deps
 */
async function buildCardTrackingReferrals(ctvId, { dentalDb, cosmeticDb, safeQueryRows }) {
  const [dRefsRaw, cRefsRaw] = await Promise.all([
    discoverCardClientsForLob(dentalDb, ctvId, safeQueryRows),
    discoverCardClientsForLob(cosmeticDb, ctvId, safeQueryRows),
  ]);

  const [dItems, cItems] = await Promise.all([
    buildCardTrackingReferralsForLob(dentalDb, dRefsRaw, ctvId, 'dental', safeQueryRows),
    buildCardTrackingReferralsForLob(cosmeticDb, cRefsRaw, ctvId, 'cosmetic', safeQueryRows),
  ]);

  return mergeReferralsAcrossLobs(dItems, cItems);
}

module.exports = {
  CARD_CLIENTS_SQL,
  discoverCardClientsForLob,
  buildCardTrackingReferralsForLob,
  mergeReferralsAcrossLobs,
  buildCardTrackingReferrals,
  buildLobLinkSnapshot,
  syncTopLevelLinkFields,
};
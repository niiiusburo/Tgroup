'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[NK3 backend service function: api/src/services/referralClaim, api/src/routes/ctv.js, api/src/routes/ctvPublic.js, api/src/routes/discountCodes.js, api/src/routes/partners/getPartnerById.js, api/src/routes/partners/resolveHandler.js, api/src/services/ctvDiscountCodes.js]
 * @crossref:uses[product-map/domains/ctv.yaml, docs/TEST-MATRIX.md, testbright.md]
 * @crossref:function[computeClaim, computeCtvLink, getCtvLinkStatus, getReferralClaimStatus]
 * @crossref:uses[api/src/routes/ctv.js, api/src/routes/ctvPublic.js, product-map/domains/cosmetic-clients.yaml]
 */
const { getDb: defaultGetDb } = require('../db');

const WINDOW_MONTHS = 6;

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function computeClaim({ ownerCtvId, ownerName, referralCardDate, bookingAppointmentDate, lastPaidServiceDate, asOf = new Date() }) {
  if (!ownerCtvId) {
    return { ownerCtvId: null, ownerName: null, anchorDate: null, expiresAt: null, active: false };
  }

  const dates = [referralCardDate, bookingAppointmentDate, lastPaidServiceDate].filter(Boolean).map((d) => new Date(d));
  const anchorDate = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
  const expiresAt = anchorDate ? addMonths(anchorDate, 6) : null;
  const active = !!expiresAt && expiresAt.getTime() > new Date(asOf).getTime();

  return { ownerCtvId, ownerName, anchorDate, expiresAt, active };
}

/**
 * Pure: pick the most-recent CTV-bearing event (service wins ties), derive the 6-month window.
 */
function computeCtvLink({ appt, service, fallbackOwnerCtvId = null, fallbackOwnerName = null, asOf = new Date() }) {
  const candidates = [];
  if (appt && appt.ctvId && appt.dt) candidates.push({ ...appt, dt: new Date(appt.dt), source: 'appointment', rank: 0 });
  if (service && service.ctvId && service.dt) candidates.push({ ...service, dt: new Date(service.dt), source: 'service', rank: 1 });

  candidates.sort((a, b) => (b.dt.getTime() - a.dt.getTime()) || (b.rank - a.rank));
  const winner = candidates[0] || null;

  if (!winner) {
    if (fallbackOwnerCtvId) {
      return {
        linkedCtvId: fallbackOwnerCtvId, linkedCtvName: fallbackOwnerName,
        anchorAt: null, anchorSource: null, expiresAt: null,
        active: true, eligible: false, windowMonths: WINDOW_MONTHS,
      };
    }
    return {
      linkedCtvId: null, linkedCtvName: null, anchorAt: null, anchorSource: null,
      expiresAt: null, active: false, eligible: true, windowMonths: WINDOW_MONTHS,
    };
  }

  const anchorAt = winner.dt;
  const expiresAt = addMonths(anchorAt, WINDOW_MONTHS);
  const active = expiresAt.getTime() > new Date(asOf).getTime();
  return {
    linkedCtvId: winner.ctvId, linkedCtvName: winner.ctvName || null,
    anchorAt, anchorSource: winner.source, expiresAt,
    active, eligible: !active, windowMonths: WINDOW_MONTHS,
  };
}

/**
 * DB wrapper: latest non-cancelled CTV-bearing appointment + saleorder for a client.
 */
async function getCtvLinkStatus(clientId, lob, opts = {}) {
  const { asOf = new Date(), txClient = null, getDb: injectedGetDb = null } = opts;
  const db = txClient || (injectedGetDb || defaultGetDb)(lob);
  const run = txClient
    ? (sql, p) => txClient.query(sql, p).then((r) => r.rows)
    : (sql, p) => db.queryRows(sql, p);

  const apptRows = await run(
    `SELECT a.ctv_id AS "ctvId", c.name AS "ctvName", COALESCE(a.date, a.datecreated) AS dt
       FROM dbo.appointments a
       LEFT JOIN dbo.partners c ON c.id = a.ctv_id
      WHERE a.partnerid = $1 AND a.ctv_id IS NOT NULL
        AND COALESCE(a.state, '') NOT ILIKE 'cancel%'
      ORDER BY COALESCE(a.date, a.datecreated) DESC NULLS LAST
      LIMIT 1`,
    [clientId]
  );

  const svcRows = await run(
    `SELECT so.ctv_id AS "ctvId", c.name AS "ctvName", COALESCE(so.dateordered, so.datecreated) AS dt
       FROM dbo.saleorders so
       LEFT JOIN dbo.partners c ON c.id = so.ctv_id
      WHERE so.partnerid = $1 AND so.ctv_id IS NOT NULL
        AND COALESCE(so.state, '') NOT ILIKE 'cancel%'
        AND COALESCE(so.isdeleted, false) = false
      ORDER BY COALESCE(so.dateordered, so.datecreated) DESC NULLS LAST
      LIMIT 1`,
    [clientId]
  );

  const ownerRows = await run(
    `SELECT p.referred_by_ctv_id AS "ownerId", o.name AS "ownerName"
       FROM dbo.partners p LEFT JOIN dbo.partners o ON o.id = p.referred_by_ctv_id
      WHERE p.id = $1`,
    [clientId]
  );

  return computeCtvLink({
    appt: apptRows[0] || null,
    service: svcRows[0] || null,
    fallbackOwnerCtvId: ownerRows[0]?.ownerId || null,
    fallbackOwnerName: ownerRows[0]?.ownerName || null,
    asOf,
  });
}

/**
 * Legacy shape, now backed by the CTV-bearing-event rule so every caller agrees with the bar.
 */
async function getReferralClaimStatus(clientId, lob, opts = {}) {
  const s = await getCtvLinkStatus(clientId, lob, opts);
  return {
    ownerCtvId: s.linkedCtvId,
    ownerName: s.linkedCtvName,
    anchorDate: s.anchorAt,
    expiresAt: s.expiresAt,
    active: s.active,
  };
}

module.exports = { computeClaim, computeCtvLink, getCtvLinkStatus, getReferralClaimStatus };

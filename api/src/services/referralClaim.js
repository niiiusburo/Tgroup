'use strict';

const { getDb: defaultGetDb } = require('../db');

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

async function getReferralClaimStatus(clientId, lob, opts = {}) {
  const { asOf = new Date(), txClient = null, getDb: injectedGetDb = null } = opts;
  const db = txClient || (injectedGetDb || defaultGetDb)(lob);
  const run = txClient
    ? (sql, p) => txClient.query(sql, p).then((r) => r.rows)
    : (sql, p) => db.queryRows(sql, p);

  const ownerRows = await run(
    `SELECT p.referred_by_ctv_id, o.name AS owner_name FROM dbo.partners p
       LEFT JOIN dbo.partners o ON o.id = p.referred_by_ctv_id WHERE p.id = $1`,
    [clientId]
  );
  const ownerCtvId = ownerRows[0]?.referred_by_ctv_id || null;

  if (!ownerCtvId) {
    return computeClaim({ ownerCtvId: null });
  }

  const settings = await run(`SELECT referral_start_product_id FROM dbo.commission_settings LIMIT 1`, []);
  const refProductId = settings[0]?.referral_start_product_id || null;

  let referralCardDate = null;
  if (refProductId) {
    const cardRows = await run(
      `SELECT MIN(so.datecreated) AS d FROM dbo.saleorderlines sol
         JOIN dbo.saleorders so ON so.id = sol.orderid
        WHERE so.partnerid = $1 AND sol.productid = $2 AND sol.isdeleted = false`,
      [clientId, refProductId]
    );
    referralCardDate = cardRows[0]?.d || null;
  }

  const appointmentRows = await run(
    `SELECT MAX(COALESCE(datecreated, date::timestamp)) AS d FROM dbo.appointments WHERE partnerid = $1`,
    [clientId]
  );
  const bookingAppointmentDate = appointmentRows[0]?.d || null;

  const payRows = await run(
    `SELECT MAX(payment_date) AS d FROM dbo.payments WHERE customer_id = $1 AND amount > 0`,
    [clientId]
  );
  const lastPaidServiceDate = payRows[0]?.d || null;

  return computeClaim({ ownerCtvId, ownerName: ownerRows[0]?.owner_name || null, referralCardDate, bookingAppointmentDate, lastPaidServiceDate, asOf });
}

module.exports = { computeClaim, getReferralClaimStatus };

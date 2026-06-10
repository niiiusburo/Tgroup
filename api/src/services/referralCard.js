'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[api/src/routes/ctvActions.js — POST /api/ctv/refer "Referral Start" anchor card]
 * @crossref:uses[api/src/db.js, api/src/lib/dateUtils.js (getVietnamYear), api/src/services/newClientsQuery.js (excludes pricetotal=0 anchor), product-map/domains/ctv.yaml]
 */
const crypto = require('crypto');
const { getDb: defaultGetDb } = require('../db');
const { getVietnamYear } = require('../lib/dateUtils');

/**
 * Create the zero-amount "Referral Start" card (saleorder + line) for a client.
 * @param {object} args { clientId, lob, getDb?, runQuery? (test injection) }
 */
async function createReferralStartCard({ clientId, lob, getDb: injectedGetDb = null, runQuery = null }) {
  const db = injectedGetDb ? injectedGetDb(lob) : defaultGetDb(lob);
  const q = runQuery || ((sql, p) => db.queryRows(sql, p));

  const settings = await q(`SELECT referral_start_product_id FROM dbo.commission_settings LIMIT 1`, []);
  const productId = settings[0]?.referral_start_product_id || null;
  if (!productId) {
    const err = new Error('REFERRAL_PRODUCT_NOT_CONFIGURED');
    err.code = 'REFERRAL_PRODUCT_NOT_CONFIGURED';
    throw err;
  }

  const orderId = crypto.randomUUID();
  const year = getVietnamYear();
  const seqRows = await q(`SELECT nextval('dbo.saleorder_code_seq') AS seq`, []);
  const code = `SO-${year}-${String(parseInt(seqRows[0]?.seq || '1', 10)).padStart(4, '0')}`;

  await q(
    `INSERT INTO saleorders (
       id, name, code, partnerid, quantity, unit, amounttotal, residual, totalpaid, state,
       notes, isdeleted, datecreated
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,(NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'))`,
    [orderId, 'Referral Start', code, clientId, 1, null, 0, 0, 0, 'sale', 'CTV referral claim anchor', false]
  );
  await q(
    `INSERT INTO saleorderlines (
       id, orderid, productid, productname, productuomqty, pricetotal, isdeleted
     ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [crypto.randomUUID(), orderId, productId, 'Referral Start', 1, 0, false]
  );

  return { orderId };
}

module.exports = { createReferralStartCard };

const crypto = require('crypto');
const { query: legacyQuery, getQuery } = require('../../db');
const { getVietnamToday, getVietnamYear } = require('../../lib/dateUtils');
const { fetchSaleOrderById } = require('./fetchSaleOrderById');
const { setCustomerReferrer } = require('../../services/customerReferrer');
const { createEarningsForServiceCard } = require('../../services/commissionEngine');

// INV-003C (Wave 2): when enabled, CTV commission is born at service-card creation on the
// FULL price. Gated to NK3 via CTV_SERVICE_CARD_COMMISSION so NK/NK2 keep the pay-as-paid model.
function serviceCardCommissionEnabled() {
  return process.env.CTV_SERVICE_CARD_COMMISSION === 'true' || process.env.CTV_SERVICE_CARD_COMMISSION === '1';
}

async function createSaleOrder(req, res) {
  try {
    const q = getQuery(req);
    const {
      partnerid,
      companyid,
      productid,
      productname,
      doctorid,
      assistantid,
      dentalaideid,
      quantity,
      unit,
      amounttotal,
      datestart,
      dateend,
      notes,
      tooth_numbers,
      tooth_comment,
      sourceid,
      ctv_id,
    } = req.body;

    if (!partnerid) {
      return res.status(400).json({ error: 'partnerid is required' });
    }
    if (parseFloat(amounttotal || 0) < 0) {
      return res.status(400).json({ error: 'amounttotal must be >= 0' });
    }
    if (quantity != null && !isNaN(parseFloat(quantity)) && parseFloat(quantity) < 0) {
      return res.status(400).json({ error: 'quantity must be >= 0' });
    }

    const id = crypto.randomUUID();
    const name = productname || `Service ${getVietnamToday()}`;
    const year = getVietnamYear();
    const seqResult = await q(`SELECT nextval('dbo.saleorder_code_seq') AS seq`);
    const seqNum = parseInt(seqResult[0]?.seq || '1', 10);
    const code = `SO-${year}-${String(seqNum).padStart(4, '0')}`;

    await q(
      `INSERT INTO saleorders (
        id, name, code, partnerid, companyid, doctorid, assistantid, dentalaideid,
        quantity, unit, amounttotal, residual, totalpaid, state,
        datestart, dateend, notes, sourceid, ctv_id,
        isdeleted, datecreated
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,(NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'))
      RETURNING *`,
      [
        id,
        name,
        code,
        partnerid,
        companyid || null,
        doctorid || null,
        assistantid || null,
        dentalaideid || null,
        quantity || null,
        unit || null,
        amounttotal || 0,
        amounttotal || 0,
        0,
        'sale',
        datestart || null,
        dateend || null,
        notes || null,
        sourceid || null,
        ctv_id || null,
        false,
      ],
    );

    if (productid) {
      const lineId = crypto.randomUUID();
      await q(
        `INSERT INTO saleorderlines (
          id, orderid, productid, productname, employeeid, assistantid,
          productuomqty, pricetotal, tooth_numbers, tooth_comment, isdeleted
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          lineId,
          id,
          productid,
          productname || null,
          doctorid || null,
          assistantid || null,
          quantity || null,
          amounttotal || 0,
          tooth_numbers || null,
          tooth_comment || null,
          false,
        ],
      );

      // INV-003C: a service card with an attached CTV earns commission at creation, on the
      // FULL price. A commission hiccup must not fail service creation — the engine is
      // idempotent, so a later retry/backfill recovers.
      if (serviceCardCommissionEnabled() && ctv_id) {
        try {
          // Resolve the product's real name + category so the braces override (§5) can match.
          let prodName = productname || null;
          let categoryName = null;
          if (productid) {
            const meta = await q(
              'SELECT p.name AS pname, pc.name AS cname FROM products p LEFT JOIN productcategories pc ON pc.id = p.categid WHERE p.id = $1',
              [productid],
            );
            if (meta && meta[0]) {
              prodName = meta[0].pname || prodName;
              categoryName = meta[0].cname || null;
            }
          }
          await createEarningsForServiceCard({
            serviceLine: { id: lineId, ctv_id, price: amounttotal || 0, client_id: partnerid, productName: prodName, categoryName },
            lob: req.lob || 'dental',
            run: q,
          });
        } catch (commissionErr) {
          console.error('[createSaleOrder] service-card commission error:', commissionErr.message);
        }
      }
    }

    // Assign the chosen CTV as the customer's commission referrer (assign-only no-op
    // when ctv_id is absent/empty — never clears an existing referrer). lob enables the
    // retroactive earnings backfill (harmless no-op on a brand-new order with no payments).
    await setCustomerReferrer(q, partnerid, ctv_id, { lob: req.lob || 'dental' });

    const rows = await fetchSaleOrderById(id, q);
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating sale order:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

module.exports = { createSaleOrder };

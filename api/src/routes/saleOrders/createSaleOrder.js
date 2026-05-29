const crypto = require('crypto');
const { query: legacyQuery, getQuery } = require('../../db');
const { getVietnamToday, getVietnamYear } = require('../../lib/dateUtils');
const { fetchSaleOrderById } = require('./fetchSaleOrderById');
const { setCustomerReferrer } = require('../../services/customerReferrer');

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
        datestart, dateend, notes, sourceid,
        isdeleted, datecreated
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,(NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'))
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
        false,
      ],
    );

    if (productid) {
      await q(
        `INSERT INTO saleorderlines (
          id, orderid, productid, productname, employeeid, assistantid,
          productuomqty, pricetotal, tooth_numbers, tooth_comment, isdeleted
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          crypto.randomUUID(),
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
    }

    // Assign the chosen CTV as the customer's commission referrer (assign-only no-op
    // when ctv_id is absent/empty — never clears an existing referrer).
    await setCustomerReferrer(q, partnerid, ctv_id);

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

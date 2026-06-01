const crypto = require('crypto');
const { query: legacyQuery, getQuery } = require('../../db');
const { calculateSaleOrderPaymentStateFromAllocations } = require('../../lib/saleOrderTotals');
const { fetchSaleOrderById } = require('./fetchSaleOrderById');
const { setCustomerReferrer, clearCustomerReferrer } = require('../../services/customerReferrer');

async function updateSaleOrder(req, res) {
  try {
    const q = getQuery(req);
    const { id } = req.params;
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

    if (amounttotal != null && parseFloat(amounttotal) < 0) {
      return res.status(400).json({ error: 'amounttotal must be >= 0' });
    }
    if (quantity != null && !isNaN(parseFloat(quantity)) && parseFloat(quantity) < 0) {
      return res.status(400).json({ error: 'quantity must be >= 0' });
    }

    const paymentState = amounttotal !== undefined
      ? await calculateSaleOrderPaymentStateFromAllocations(q, id, amounttotal)
      : null;

    const fields = [
      { key: 'partnerid', val: partnerid },
      { key: 'companyid', val: companyid },
      { key: 'doctorid', val: doctorid },
      { key: 'assistantid', val: assistantid },
      { key: 'dentalaideid', val: dentalaideid },
      { key: 'quantity', val: quantity },
      { key: 'unit', val: unit },
      { key: 'datestart', val: datestart },
      { key: 'dateend', val: dateend },
      { key: 'notes', val: notes },
      { key: 'sourceid', val: sourceid },
      // Per-service CTV (v3 commission). undefined => unchanged; null/'' => clear; uuid => set.
      { key: 'ctv_id', val: ctv_id },
    ];
    if (paymentState) {
      fields.push(
        { key: 'amounttotal', val: paymentState.amountTotal },
        { key: 'totalpaid', val: paymentState.totalPaid },
        { key: 'residual', val: paymentState.residual },
      );
    }

    // A CTV change (assign OR explicit clear) counts as a valid update — the customer's
    // referrer changes even when no sale-order column does — so it must not trip
    // "No fields to update". Presence of the ctv_id key signals intent (the edit form always
    // sends it; null/'' means the user picked "None").
    const ctvProvided = Object.prototype.hasOwnProperty.call(req.body, 'ctv_id');

    const updatedOrder = await updateSaleOrderFields(q, id, fields);
    if (!updatedOrder && !hasLineUpdate(req.body) && !ctvProvided) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    if (updatedOrder === null) {
      return res.status(404).json({ error: 'Sale order not found' });
    }

    await updatePrimarySaleOrderLine(q, id, {
      productid,
      productname,
      doctorid,
      assistantid,
      quantity,
      amounttotal,
      tooth_numbers,
      tooth_comment,
      paymentState,
    });

    // Apply the CTV change when the edit sent ctv_id: a UUID assigns the referrer (validated),
    // null/'' explicitly clears it (the edit form pre-fills the current CTV, so "None" is
    // deliberate). Resolve the customer from the order if the body didn't carry partnerid.
    if (ctvProvided) {
      let customerId = partnerid;
      if (!customerId) {
        const ownerRows = await q('SELECT partnerid FROM saleorders WHERE id = $1', [id]);
        customerId = ownerRows[0]?.partnerid || null;
      }
      if (ctv_id) {
        await setCustomerReferrer(q, customerId, ctv_id, { lob: req.lob || 'dental' });
      } else {
        await clearCustomerReferrer(q, customerId);
      }
    }

    const rows = await fetchSaleOrderById(id, q);
    if (!rows || !rows[0]) {
      return res.status(404).json({ error: 'Sale order not found' });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error('Error updating sale order:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

async function updateSaleOrderFields(q, id, fields) {
  const sets = [];
  const values = [];
  let paramIdx = 1;

  for (const f of fields) {
    if (f.val !== undefined) {
      sets.push(`${f.key} = $${paramIdx}`);
      values.push(f.val === '' ? null : f.val);
      paramIdx++;
    }
  }

  if (sets.length === 0) return undefined;
  values.push(id);
  const rows = await q(
    `UPDATE saleorders SET ${sets.join(', ')} WHERE id = $${paramIdx} AND isdeleted = false RETURNING *`,
    values,
  );
  return rows && rows.length > 0 ? rows[0] : null;
}

function hasLineUpdate(body) {
  return (
    body.productid !== undefined ||
    body.productname !== undefined ||
    body.doctorid !== undefined ||
    body.assistantid !== undefined ||
    body.quantity !== undefined ||
    body.amounttotal !== undefined ||
    body.tooth_numbers !== undefined ||
    body.tooth_comment !== undefined
  );
}

async function updatePrimarySaleOrderLine(q, orderId, fields) {
  if (!hasLineUpdate(fields)) return;

  const existingLine = await q(
    `SELECT id, productid FROM saleorderlines WHERE orderid = $1 AND isdeleted = false LIMIT 1`,
    [orderId],
  );

  if (existingLine && existingLine.length > 0) {
    await updateExistingLine(q, existingLine[0].id, fields);
  } else if (fields.productid) {
    await insertPrimaryLine(q, orderId, fields);
  }
}

async function updateExistingLine(q, lineId, fields) {
  const lineSets = [];
  const lineValues = [];
  let lineIdx = 1;

  if (fields.productid !== undefined) {
    lineSets.push(`productid = $${lineIdx}`);
    lineValues.push(fields.productid || null);
    lineIdx++;
  }
  if (fields.productname !== undefined) {
    lineSets.push(`productname = $${lineIdx}`);
    lineValues.push(fields.productname || null);
    lineIdx++;
  }
  if (fields.doctorid !== undefined) {
    lineSets.push(`employeeid = $${lineIdx}`);
    lineValues.push(fields.doctorid || null);
    lineIdx++;
  }
  if (fields.assistantid !== undefined) {
    lineSets.push(`assistantid = $${lineIdx}`);
    lineValues.push(fields.assistantid || null);
    lineIdx++;
  }
  if (fields.quantity !== undefined) {
    lineSets.push(`productuomqty = $${lineIdx}`);
    lineValues.push(fields.quantity === '' ? null : fields.quantity);
    lineIdx++;
  }
  if (fields.amounttotal !== undefined) {
    lineSets.push(`pricetotal = $${lineIdx}`);
    lineValues.push(fields.paymentState.amountTotal);
    lineIdx++;
    lineSets.push(`amountpaid = $${lineIdx}`);
    lineValues.push(fields.paymentState.totalPaid);
    lineIdx++;
    lineSets.push(`amountresidual = $${lineIdx}`);
    lineValues.push(fields.paymentState.residual);
    lineIdx++;
  }
  if (fields.tooth_numbers !== undefined) {
    lineSets.push(`tooth_numbers = $${lineIdx}`);
    lineValues.push(fields.tooth_numbers || null);
    lineIdx++;
  }
  if (fields.tooth_comment !== undefined) {
    lineSets.push(`tooth_comment = $${lineIdx}`);
    lineValues.push(fields.tooth_comment || null);
    lineIdx++;
  }

  if (lineSets.length === 0) return;
  lineValues.push(lineId);
  await q(`UPDATE saleorderlines SET ${lineSets.join(', ')} WHERE id = $${lineIdx}`, lineValues);
}

async function insertPrimaryLine(q, orderId, fields) {
  const lineId = crypto.randomUUID();
  await q(
    `INSERT INTO saleorderlines (
      id, orderid, productid, productname, employeeid, assistantid,
      productuomqty, pricetotal, tooth_numbers, tooth_comment, isdeleted
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      lineId,
      orderId,
      fields.productid,
      fields.productname || null,
      fields.doctorid || null,
      fields.assistantid || null,
      fields.quantity ?? null,
      fields.paymentState?.amountTotal ?? fields.amounttotal ?? 0,
      fields.tooth_numbers || null,
      fields.tooth_comment || null,
      false,
    ],
  );
}

module.exports = { updateSaleOrder };

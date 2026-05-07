const crypto = require('crypto');
const { query } = require('../../db');
const { calculateSaleOrderPaymentStateFromAllocations } = require('../../lib/saleOrderTotals');
const { fetchSaleOrderById } = require('./fetchSaleOrderById');

async function updateSaleOrder(req, res) {
  try {
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
    } = req.body;

    if (amounttotal != null && parseFloat(amounttotal) < 0) {
      return res.status(400).json({ error: 'amounttotal must be >= 0' });
    }
    if (quantity != null && !isNaN(parseFloat(quantity)) && parseFloat(quantity) < 0) {
      return res.status(400).json({ error: 'quantity must be >= 0' });
    }

    const paymentState = amounttotal !== undefined
      ? await calculateSaleOrderPaymentStateFromAllocations(query, id, amounttotal)
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
    ];
    if (paymentState) {
      fields.push(
        { key: 'amounttotal', val: paymentState.amountTotal },
        { key: 'totalpaid', val: paymentState.totalPaid },
        { key: 'residual', val: paymentState.residual },
      );
    }

    const updatedOrder = await updateSaleOrderFields(id, fields);
    if (!updatedOrder && !hasLineUpdate(req.body)) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    if (updatedOrder === null) {
      return res.status(404).json({ error: 'Sale order not found' });
    }

    await updatePrimarySaleOrderLine(id, {
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

    const rows = await fetchSaleOrderById(id);
    return res.json(rows[0]);
  } catch (err) {
    console.error('Error updating sale order:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

async function updateSaleOrderFields(id, fields) {
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
  const rows = await query(
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

async function updatePrimarySaleOrderLine(orderId, fields) {
  if (!hasLineUpdate(fields)) return;

  const existingLine = await query(
    `SELECT id, productid FROM saleorderlines WHERE orderid = $1 AND isdeleted = false LIMIT 1`,
    [orderId],
  );

  if (existingLine && existingLine.length > 0) {
    await updateExistingLine(existingLine[0].id, fields);
  } else if (fields.productid) {
    await insertPrimaryLine(orderId, fields);
  }
}

async function updateExistingLine(lineId, fields) {
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
  await query(`UPDATE saleorderlines SET ${lineSets.join(', ')} WHERE id = $${lineIdx}`, lineValues);
}

async function insertPrimaryLine(orderId, fields) {
  const lineId = crypto.randomUUID();
  await query(
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

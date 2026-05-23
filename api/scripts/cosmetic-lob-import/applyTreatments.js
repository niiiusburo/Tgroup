const crypto = require('crypto');
const { textKey } = require('./normalizers');
const { firstExisting, makeImportedNote } = require('./apply');

async function insertTreatment(client, exam, maps) {
  const customer = firstExisting(maps.customersByPhone, exam.phone);
  if (!customer) return { type: 'manual_review' };
  const product = maps.productsByName.get(textKey(exam.serviceName));
  if (!product) return { type: 'manual_review' };
  const company = maps.companyByName.get(textKey(exam.branchName)) || maps.companyByName.get(textKey(customer.branchName));
  const doctor = maps.staffByName.get(textKey(exam.doctorName));
  const assistant = maps.staffByName.get(textKey(exam.assistantName));
  const serviceAmount = Math.max(0, exam.serviceAmount || 0);
  const paidAmount = Math.max(0, exam.paidAmount || 0);
  const residual = Math.max(0, serviceAmount - paidAmount);
  const orderId = crypto.randomUUID();
  const lineId = crypto.randomUUID();
  await client.query(
    `INSERT INTO saleorders (
      id, name, code, partnerid, companyid, doctorid, assistantid,
      amounttotal, residual, totalpaid, state, datestart, dateend,
      notes, isdeleted, datecreated, dateordered, lastupdated, origin
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'sale',$11,$11,$12,false,$13,$13,NOW(),'cosmetic-sheet')`,
    [
      orderId,
      exam.serviceName || exam.orderCode,
      exam.orderCode,
      customer.id,
      company?.id || customer.companyid || null,
      doctor?.id || null,
      assistant?.id || null,
      serviceAmount,
      residual,
      paidAmount,
      exam.serviceDate || null,
      makeImportedNote('Imported cosmetic treatment', exam),
      exam.serviceDate || new Date(),
    ],
  );
  await client.query(
    `INSERT INTO saleorderlines (
      id, orderid, productid, productname, pricetotal, priceunit, pricesubtotal,
      amountpaid, amountresidual, date, note, state, orderpartnerid, companyid,
      employeeid, assistantid, productuomqty, isdeleted, isactive, datecreated,
      lastupdated, name
    ) VALUES ($1,$2,$3,$4,$5,$5,$5,$6,$7,$8,$9,'sale',$10,$11,$12,$13,1,false,true,$8,NOW(),$4)`,
    [
      lineId,
      orderId,
      product.id,
      exam.serviceName,
      serviceAmount,
      paidAmount,
      residual,
      exam.serviceDate || new Date(),
      exam.note || null,
      customer.id,
      company?.id || customer.companyid || null,
      doctor?.id || null,
      assistant?.id || null,
    ],
  );
  maps.orderCodes.add(exam.orderCode);
  return { type: 'created', orderId, lineId, customerId: customer.id };
}

async function insertServicePayment(client, exam, treatment) {
  const cashAmount = exam.method === 'cash' ? exam.paidAmount : 0;
  const bankAmount = exam.method === 'bank_transfer' ? exam.paidAmount : 0;
  const paymentId = crypto.randomUUID();
  await client.query(
    `INSERT INTO payments (
      id, customer_id, service_id, amount, method, notes, payment_date,
      reference_code, status, deposit_used, cash_amount, bank_amount,
      deposit_type, receipt_number, payment_category
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'posted',0,$9,$10,NULL,NULL,'payment')`,
    [
      paymentId,
      treatment.customerId,
      treatment.orderId,
      exam.paidAmount,
      exam.method,
      makeImportedNote('Imported cosmetic service payment', exam),
      exam.paymentDate || exam.serviceDate || null,
      exam.paymentReferenceCode,
      cashAmount,
      bankAmount,
    ],
  );
  await client.query(
    `INSERT INTO payment_allocations (id, payment_id, invoice_id, allocated_amount, created_at)
     VALUES ($1,$2,$3,$4,NOW())`,
    [crypto.randomUUID(), paymentId, treatment.orderId, exam.paidAmount],
  );
}

async function applyTreatmentsAndPayments(client, source, maps) {
  let treatmentsCreated = 0;
  let treatmentsSkipped = 0;
  let treatmentsManualReview = 0;
  let paymentsCreated = 0;
  let paymentsSkipped = 0;
  for (const exam of source.exams) {
    let treatment = null;
    if (maps.orderCodes.has(exam.orderCode)) {
      treatmentsSkipped += 1;
      const existing = await client.query('SELECT id, partnerid FROM saleorders WHERE code = $1 LIMIT 1', [exam.orderCode]);
      if (existing.rows[0]) treatment = { orderId: existing.rows[0].id, customerId: existing.rows[0].partnerid };
    } else {
      treatment = await insertTreatment(client, exam, maps);
      if (treatment.type === 'manual_review') {
        treatmentsManualReview += 1;
        continue;
      }
      treatmentsCreated += 1;
    }
    if (exam.paidAmount > 0) {
      if (maps.paymentRefs.has(exam.paymentReferenceCode)) {
        paymentsSkipped += 1;
      } else {
        await insertServicePayment(client, exam, treatment);
        maps.paymentRefs.add(exam.paymentReferenceCode);
        paymentsCreated += 1;
      }
    }
  }
  return {
    treatments: { created: treatmentsCreated, skipped: treatmentsSkipped, manualReview: treatmentsManualReview },
    payments: { created: paymentsCreated, skipped: paymentsSkipped },
  };
}

module.exports = {
  applyTreatmentsAndPayments,
};

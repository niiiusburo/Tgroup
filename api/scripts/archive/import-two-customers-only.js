const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const SOURCE_DB = 'postgresql://postgres:postgres@127.0.0.1:55433/tdental_real';
const TARGET_DB = 'postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo';

const TARGET_PARTNER_IDS = [
  '90edb637-1d32-4280-8088-b1a400ff0073', // KIM THỊ THẢO NHI
  'cd985f43-2f12-4d6d-b1b8-b23000efbac3', // LƯƠNG HỒNG NHUNG
];

const EXPLICIT_PATTERNS = [
  { regex: /TGLC/i, installment: 'final' },
  { regex: /TGL(\d+)/i, group: 1 },
  { regex: /TR[ẢA]\s*G[ÓO]P\s*L[AẦNN]\s*(\d+)/i, group: 1 },
  { regex: /TR[ẢA]\s*G[ÓO]P\s+L(\d+)/i, group: 1 },
  { regex: /L([\d]+)(?:\s|$|-)/i, group: 1 },
];

const INSTALLMENT_KEYWORDS = /trả góp|tra gop|TGL|niềng theo tháng|niềng theo gói/i;

function extractInstallmentNumber(text) {
  if (!text) return null;
  for (const p of EXPLICIT_PATTERNS) {
    const m = text.match(p.regex);
    if (m) {
      if (p.installment === 'final') return 'final';
      const n = parseInt(m[p.group], 10);
      if (!isNaN(n) && n > 0 && n < 100) return n;
    }
  }
  return null;
}

function cleanTreatmentDescription(communication) {
  if (!communication) return 'Điều trị nha khoa';
  let t = communication
    .replace(/^\s*\d+[-\s]*[A-Z]+[-\s]*/i, '')
    .replace(/\b(TGL\d*|TGLC|TRẢ GÓP[^\-]*|TRA GOP[^\-]*|L\d+)\b/gi, '')
    .replace(/\b(CK|MB|TM|MSB|CASH|BANK)\b/gi, '')
    .replace(/[-_\s]+$/g, '')
    .trim();
  if (!t) return 'Điều trị nha khoa';
  return t;
}

function mode(arr) {
  const freq = {};
  let max = 0, val = arr[0];
  for (const v of arr) {
    const key = Math.round(v / 1000) * 1000;
    freq[key] = (freq[key] || 0) + 1;
    if (freq[key] > max) {
      max = freq[key];
      val = v;
    }
  }
  return val;
}

function groupPaymentsIntoPlans(payments) {
  payments.sort((a, b) => new Date(a.paymentdate) - new Date(b.paymentdate));
  const chunks = [];
  let currentChunk = [payments[0]];
  for (let i = 1; i < payments.length; i++) {
    const prev = new Date(payments[i-1].paymentdate);
    const curr = new Date(payments[i].paymentdate);
    if ((curr - prev) / (1000 * 60 * 60 * 24) > 180) {
      chunks.push(currentChunk);
      currentChunk = [];
    }
    currentChunk.push(payments[i]);
  }
  chunks.push(currentChunk);
  
  const plans = [];
  for (const chunk of chunks) {
    if (chunk.length < 2) continue;
    const explicit = chunk.map(p => ({
      ...p,
      instNum: extractInstallmentNumber(p.communication),
    }));
    const withInstNum = explicit.filter(p => typeof p.instNum === 'number');
    const withoutInstNum = explicit.filter(p => typeof p.instNum !== 'number');
    let installmentAmount, downPayment, startDate, numberOfInstallments, totalAmount;
    let installments = [];
    
    if (withInstNum.length >= 1) {
      const instPayments = withInstNum.sort((a, b) => a.instNum - b.instNum);
      installmentAmount = mode(instPayments.map(p => parseFloat(p.amount)));
      const firstInstDate = new Date(instPayments[0].paymentdate);
      const downPayments = withoutInstNum.filter(p => 
        new Date(p.paymentdate) < firstInstDate || 
        Math.abs(parseFloat(p.amount) - installmentAmount) > installmentAmount * 0.5
      );
      downPayment = downPayments.reduce((s, p) => s + parseFloat(p.amount), 0);
      const maxInstNum = Math.max(...instPayments.map(p => p.instNum));
      const hasFinal = explicit.some(p => p.instNum === 'final');
      numberOfInstallments = hasFinal ? maxInstNum + 1 : maxInstNum;
      totalAmount = downPayment + (installmentAmount * numberOfInstallments);
      startDate = instPayments[0].paymentdate;
      for (let i = 1; i <= numberOfInstallments; i++) {
        const paid = instPayments.find(p => p.instNum === i) || 
                     explicit.find(p => p.instNum === 'final' && i === numberOfInstallments);
        installments.push({
          installmentNumber: i,
          amount: installmentAmount,
          status: paid ? 'paid' : 'pending',
          paidDate: paid ? paid.paymentdate : null,
          paidAmount: paid ? parseFloat(paid.amount) : null,
        });
      }
    } else {
      const amounts = chunk.map(p => parseFloat(p.amount));
      const candidateAmount = mode(amounts);
      const recurring = chunk.filter(p => {
        const a = parseFloat(p.amount);
        return Math.abs(a - candidateAmount) <= candidateAmount * 0.2;
      });
      if (recurring.length < 2) continue;
      installmentAmount = candidateAmount;
      const firstRecurringDate = new Date(recurring[0].paymentdate);
      const downPayments = chunk.filter(p => {
        const a = parseFloat(p.amount);
        const d = new Date(p.paymentdate);
        return d < firstRecurringDate || Math.abs(a - candidateAmount) > candidateAmount * 0.5;
      });
      downPayment = downPayments.reduce((s, p) => s + parseFloat(p.amount), 0);
      numberOfInstallments = recurring.length;
      totalAmount = downPayment + (installmentAmount * numberOfInstallments);
      startDate = recurring[0].paymentdate;
      for (let i = 0; i < recurring.length; i++) {
        installments.push({
          installmentNumber: i + 1,
          amount: installmentAmount,
          status: 'paid',
          paidDate: recurring[i].paymentdate,
          paidAmount: parseFloat(recurring[i].amount),
        });
      }
    }
    const comms = chunk.map(p => p.communication).filter(Boolean);
    const treatmentDescription = cleanTreatmentDescription(
      comms.find(c => c.length > 10) || comms[0] || ''
    );
    plans.push({
      customerId: chunk[0].partnerid,
      companyId: chunk[0].companyid,
      treatmentDescription,
      totalAmount,
      downPayment,
      installmentAmount,
      numberOfInstallments,
      startDate,
      notes: `Imported from ${chunk.length} historical payments`,
      installments,
    });
  }
  return plans;
}

async function migrateCustomer(source, target, partnerId) {
  console.log(`\n--- Migrating customer ${partnerId} ---`);
  
  // 1. Partner
  const partnerRes = await source.query('SELECT * FROM partners WHERE id = $1', [partnerId]);
  if (partnerRes.rows.length === 0) {
    console.log('Partner not found');
    return;
  }
  const p = partnerRes.rows[0];
  
  // Insert partner (use same ID)
  await target.query(`
    INSERT INTO partners (
      id, name, displayname, active, customer, supplier, employee,
      isagent, isinsurance, iscompany, ishead, isbusinessinvoice, isdeleted, companyid, datecreated
    ) VALUES ($1,$2,$2,true,true,false,false,false,false,false,false,false,false,$3,NOW())
    ON CONFLICT (id) DO NOTHING
  `, [p.id, p.name || 'Khách hàng', p.companyid]);
  console.log('Partner imported');
  
  // 2. Appointments
  const apptRes = await source.query(`
    SELECT * FROM appointments WHERE partnerid = $1 ORDER BY date DESC
  `, [partnerId]);
  for (const a of apptRes.rows) {
    await target.query(`
      INSERT INTO appointments (
        id, name, date, time, datetimeappointment, dateappointmentreminder, timeexpected, note, userid,
        partnerid, companyid, dotkhamid, doctorid, state, reason, saleorderid, isrepeatcustomer, color,
        createdbyid, writebyid, datecreated, lastupdated, leadid, callid, teamid, lastdatereminder,
        confirmedid, datetimearrived, datetimedismissed, datetimeseated, aptstate, customerreceiptid,
        customercarestatus, datedone, isnotreatment, crmtaskid
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36
      ) ON CONFLICT (id) DO NOTHING
    `, [
      a.id, a.name, a.date, a.time, a.datetimeappointment, a.dateappointmentreminder, a.timeexpected,
      a.note, a.userid, a.partnerid, a.companyid, a.dotkhamid, a.doctorid, a.state, a.reason,
      a.saleorderid, a.isrepeatcustomer, a.color, a.createdbyid, a.writebyid, a.datecreated,
      a.lastupdated, a.leadid, a.callid, a.teamid, a.lastdatereminder, a.confirmedid,
      a.datetimearrived, a.datetimedismissed, a.datetimeseated, a.aptstate, a.customerreceiptid,
      a.customercarestatus, a.datedone, a.isnotreatment, a.crmtaskid
    ]);
  }
  console.log(`Appointments imported: ${apptRes.rows.length}`);
  
  // 3. Saleorders + Saleorderlines (tdental_demo has limited schema)
  const soRes = await source.query(`SELECT * FROM saleorders WHERE partnerid = $1 AND isdeleted = false`, [partnerId]);
  let soLinesCount = 0;
  for (const so of soRes.rows) {
    await target.query(`
      INSERT INTO saleorders (
        id, name, partnerid, companyid, doctorid, amounttotal, residual, totalpaid, state,
        isdeleted, datecreated, assistantid, quantity, unit
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (id) DO NOTHING
    `, [
      so.id, so.name, so.partnerid, so.companyid, so.doctorid, so.amounttotal,
      so.residual, so.totalpaid, so.state, so.isdeleted, so.datecreated,
      so.assistantid, so.quantity, so.unit
    ]);

    const solRes = await source.query(`SELECT * FROM saleorderlines WHERE orderid = $1`, [so.id]);
    for (const sol of solRes.rows) {
      await target.query(`
        INSERT INTO saleorderlines (
          id, orderid, productid, productname, pricetotal, isdeleted, datecreated
        ) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING
      `, [sol.id, sol.orderid, sol.productid, sol.productname, sol.pricetotal, sol.isdeleted, sol.datecreated]);
      soLinesCount++;
    }
  }
  console.log(`Saleorders imported: ${soRes.rows.length}, lines: ${soLinesCount}`);
  
  // 4. Accountpayments -> local payments table
  const apRes = await source.query(`
    SELECT * FROM accountpayments WHERE partnerid = $1 AND state = 'posted' ORDER BY paymentdate
  `, [partnerId]);
  for (const ap of apRes.rows) {
    await target.query(`
      INSERT INTO payments (id, customer_id, service_id, amount, method, notes, created_at)
      VALUES ($1, $2, NULL, $3, 'cash', $4, $5)
      ON CONFLICT (id) DO NOTHING
    `, [ap.id, ap.partnerid, ap.amount, ap.communication || ap.name, ap.paymentdate]);
  }
  console.log(`Payments imported: ${apRes.rows.length}`);
  
  // 5. Monthly Plans
  const apPaymentsRes = await source.query(`
    SELECT id, partnerid, companyid, amount, paymentdate::date as paymentdate, communication, state
    FROM accountpayments
    WHERE state = 'posted' AND partnerid = $1 AND communication ~* $2
    ORDER BY paymentdate
  `, [partnerId, INSTALLMENT_KEYWORDS.source]);
  
  let payments = apPaymentsRes.rows;
  if (payments.length < 2) {
    // Try implicit recurring
    const implicitRes = await source.query(`
      SELECT id, partnerid, companyid, amount, paymentdate::date as paymentdate, communication, state
      FROM accountpayments
      WHERE state = 'posted' AND partnerid = $1
      ORDER BY paymentdate
    `, [partnerId]);
    payments = implicitRes.rows;
  }
  
  if (payments.length >= 2) {
    const plans = groupPaymentsIntoPlans(payments);
    for (const plan of plans) {
      const planId = uuidv4();
      await target.query(`
        INSERT INTO monthlyplans (
          id, customer_id, company_id, treatment_description, total_amount,
          down_payment, installment_amount, number_of_installments, start_date,
          status, notes, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
      `, [
        planId, plan.customerId, plan.companyId, plan.treatmentDescription,
        plan.totalAmount, plan.downPayment, plan.installmentAmount,
        plan.numberOfInstallments, plan.startDate,
        plan.installments.every(i => i.status === 'paid') ? 'completed' : 'active',
        plan.notes
      ]);
      
      for (const inst of plan.installments) {
        await target.query(`
          INSERT INTO planinstallments (
            id, plan_id, installment_number, due_date, amount, status, paid_date, paid_amount, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
        `, [
          uuidv4(), planId, inst.installmentNumber,
          new Date(new Date(plan.startDate).setMonth(new Date(plan.startDate).getMonth() + inst.installmentNumber - 1)),
          inst.amount, inst.status, inst.paidDate, inst.paidAmount
        ]);
      }
      console.log(`Plan created: ${plan.numberOfInstallments} installments, total ${plan.totalAmount}`);
    }
  } else {
    console.log('Not enough payments for plan');
  }
}

async function main() {
  const source = new Client({ connectionString: SOURCE_DB, options: '-c search_path=dbo' });
  const target = new Client({ connectionString: TARGET_DB, options: '-c search_path=dbo' });
  await source.connect();
  await target.connect();
  
  for (const pid of TARGET_PARTNER_IDS) {
    await migrateCustomer(source, target, pid);
  }
  
  console.log('\n✅ Done — only 2 customers imported');
  await source.end();
  await target.end();
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});

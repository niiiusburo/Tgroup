const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const SOURCE_DB = 'postgresql://postgres:postgres@127.0.0.1:55433/tdental_real';
const TARGET_DB = 'postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo';

// Regex patterns to extract installment info from Vietnamese payment descriptions
const EXPLICIT_PATTERNS = [
  { regex: /TGLC/i, installment: 'final' },               // Tra Gop Lan Cuoi
  { regex: /TGL(\d+)/i, group: 1 },                      // TGL1, TGL2...
  { regex: /TR[ẢA]\s*G[ÓO]P\s*L[AẦNN]\s*(\d+)/i, group: 1 }, // TRẢ GÓP LẦN 4
  { regex: /TR[ẢA]\s*G[ÓO]P\s+L(\d+)/i, group: 1 },    // trả góp l1
  { regex: /L([\d]+)(?:\s|$|-)/i, group: 1 },           // l1, l2 (when near tra gop)
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
    .replace(/^\s*\d+[-\s]*[A-Z]+[-\s]*/i, '')          // "19-MB-", "35-MSB-"
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
    const key = Math.round(v / 1000) * 1000; // round to nearest 1k
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
  
  // Split into chunks if gap > 6 months
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
    if (chunk.length < 2) continue; // Need at least 2 payments for a plan
    
    // Identify explicit installments
    const explicit = chunk.map(p => ({
      ...p,
      instNum: extractInstallmentNumber(p.communication),
    }));
    
    const withInstNum = explicit.filter(p => typeof p.instNum === 'number');
    const withoutInstNum = explicit.filter(p => typeof p.instNum !== 'number');
    
    let installmentAmount, downPayment, startDate, numberOfInstallments, totalAmount;
    let installments = [];
    
    if (withInstNum.length >= 1) {
      // Explicit plan
      const instPayments = withInstNum.sort((a, b) => a.instNum - b.instNum);
      installmentAmount = mode(instPayments.map(p => parseFloat(p.amount)));
      
      // Payments before first explicit installment or with very different amount = down payment
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
      
      // Build installment records
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
      // Implicit plan — detect recurring amount
      const amounts = chunk.map(p => parseFloat(p.amount));
      const candidateAmount = mode(amounts);
      const recurring = chunk.filter(p => {
        const a = parseFloat(p.amount);
        return Math.abs(a - candidateAmount) <= candidateAmount * 0.2;
      });
      
      if (recurring.length < 2) continue; // Not a real plan
      
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
    
    // Extract treatment description from the most informative communication
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
      notes: `Migrated from ${chunk.length} historical payments. Source communications: ${comms.slice(0, 3).join('; ')}${comms.length > 3 ? '...' : ''}`,
      installments,
    });
  }
  
  return plans;
}

async function main() {
  const source = new Client({ connectionString: SOURCE_DB, options: '-c search_path=dbo' });
  const target = new Client({ connectionString: TARGET_DB, options: '-c search_path=dbo' });
  await source.connect();
  await target.connect();
  
  // Fetch all installment-related payments
  console.log('Fetching installment-related payments from source DB...');
  const paymentsRes = await source.query(`
    SELECT 
      ap.id, ap.partnerid, ap.companyid, ap.amount, 
      ap.paymentdate::date as paymentdate, ap.communication, ap.state
    FROM accountpayments ap
    WHERE ap.state = 'posted'
      AND ap.communication ~* $1
    ORDER BY ap.partnerid, ap.companyid, ap.paymentdate
  `, [INSTALLMENT_KEYWORDS.source]);
  
  console.log(`Found ${paymentsRes.rows.length} payments`);
  
  // Group by customer+company
  const groups = {};
  for (const row of paymentsRes.rows) {
    const key = `${row.partnerid}|${row.companyid}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }
  
  console.log(`Grouped into ${Object.keys(groups).length} customer+company buckets`);
  
  // Also fetch implicit recurring customers (3+ similar payments over 2+ months)
  const implicitRes = await source.query(`
    SELECT partnerid, companyid
    FROM accountpayments
    WHERE state = 'posted'
    GROUP BY partnerid, companyid
    HAVING COUNT(*) >= 3 
       AND MAX(paymentdate) - MIN(paymentdate) > INTERVAL '30 days'
       AND STDDEV(amount) / NULLIF(AVG(amount), 0) < 0.5
  `);
  
  const implicitKeys = new Set(implicitRes.rows.map(r => `${r.partnerid}|${r.companyid}`));
  
  // For implicit keys not already covered by explicit payments, fetch their payments
  let implicitCount = 0;
  for (const key of implicitKeys) {
    if (groups[key]) continue; // Already covered
    const [partnerid, companyid] = key.split('|');
    const impPayments = await source.query(`
      SELECT id, partnerid, companyid, amount, paymentdate::date as paymentdate, communication, state
      FROM accountpayments
      WHERE state = 'posted' AND partnerid = $1 AND companyid = $2
      ORDER BY paymentdate
    `, [partnerid, companyid]);
    if (impPayments.rows.length >= 3) {
      groups[key] = impPayments.rows;
      implicitCount++;
    }
  }
  
  console.log(`Added ${implicitCount} implicit recurring groups`);
  console.log(`Total groups to process: ${Object.keys(groups).length}`);
  
  let totalPlans = 0;
  let totalInstallments = 0;
  
  // Process each group
  for (const [key, payments] of Object.entries(groups)) {
    const plans = groupPaymentsIntoPlans(payments);
    
    for (const plan of plans) {
      const planId = uuidv4();
      
      await target.query(`
        INSERT INTO monthlyplans (
          id, customer_id, company_id, treatment_description, total_amount,
          down_payment, installment_amount, number_of_installments, start_date,
          status, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
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
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `, [
          uuidv4(), planId, inst.installmentNumber,
          new Date(new Date(plan.startDate).setMonth(new Date(plan.startDate).getMonth() + inst.installmentNumber - 1)),
          inst.amount, inst.status, inst.paidDate, inst.paidAmount
        ]);
        totalInstallments++;
      }
      
      totalPlans++;
    }
  }
  
  console.log(`\n✅ Migration complete!`);
  console.log(`Created ${totalPlans} monthly plans`);
  console.log(`Created ${totalInstallments} installments`);
  
  await source.end();
  await target.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

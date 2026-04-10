const { Client } = require('pg');

const SOURCE_DB = 'postgresql://postgres:postgres@127.0.0.1:55433/tdental_real';
const TARGET_DB = 'postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo';

async function main() {
  const source = new Client({ connectionString: SOURCE_DB, options: '-c search_path=dbo' });
  const target = new Client({ connectionString: TARGET_DB, options: '-c search_path=dbo' });
  await source.connect();
  await target.connect();

  // Get all migrated plans with their first installment date and customer
  const plansRes = await target.query(`
    SELECT 
      mp.id,
      mp.customer_id,
      mp.company_id,
      mp.total_amount,
      mp.down_payment,
      mp.start_date,
      p.name as customer_name
    FROM monthlyplans mp
    JOIN partners p ON p.id = mp.customer_id
  `);

  console.log(`Found ${plansRes.rows.length} migrated plans to check for missing down payments`);

  let updatedPlans = 0;
  let totalDownPaymentAdded = 0;

  for (const plan of plansRes.rows) {
    // Find payments BEFORE the first installment start date for this customer+company
    // Exclude payments that already contain installment keywords (those were already counted)
    const downPaymentRes = await source.query(`
      SELECT COALESCE(SUM(amount), 0) as down_payment_amount,
             STRING_AGG(DISTINCT communication, ' | ' ORDER BY communication) as communications,
             COUNT(*) as payment_count
      FROM accountpayments
      WHERE state = 'posted'
        AND partnerid = $1
        AND companyid = $2
        AND paymentdate::date < $3
        AND (communication IS NULL OR communication !~* '(trả góp|tra gop|TGL|niềng theo tháng|niềng theo gói)')
    `, [plan.customer_id, plan.company_id, plan.start_date]);

    const downPaymentAmount = parseFloat(downPaymentRes.rows[0].down_payment_amount || 0);
    const paymentCount = parseInt(downPaymentRes.rows[0].payment_count || 0);

    if (downPaymentAmount > 0) {
      const newTotal = parseFloat(plan.total_amount) + downPaymentAmount;
      const newDownPayment = parseFloat(plan.down_payment || 0) + downPaymentAmount;

      await target.query(`
        UPDATE monthlyplans
        SET total_amount = $1,
            down_payment = $2,
            notes = COALESCE(notes, '') || E'\n[Down Payment Pass 2]: Added ' || $3 || ' VND from ' || $4 || ' pre-plan payments. Comms: ' || LEFT($5, 200)
        WHERE id = $6
      `, [newTotal, newDownPayment, downPaymentAmount, paymentCount, downPaymentRes.rows[0].communications || '', plan.id]);

      updatedPlans++;
      totalDownPaymentAdded += downPaymentAmount;

      if (updatedPlans % 100 === 0) {
        console.log(`  ... processed ${updatedPlans} plans, added ${totalDownPaymentAdded} VND so far`);
      }
    }
  }

  console.log(`\n✅ Down Payment Pass 2 complete!`);
  console.log(`Updated ${updatedPlans} plans with missing down payments`);
  console.log(`Total down payment amount added: ${totalDownPaymentAdded.toLocaleString()} VND`);

  await source.end();
  await target.end();
}

main().catch(err => {
  console.error('Down payment pass failed:', err);
  process.exit(1);
});

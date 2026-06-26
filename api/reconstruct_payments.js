const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: '-c search_path=dbo' });

async function main() {
  const client = await pool.connect();
  try {
    // Braces saleorders with original amounts (from earlier notes)
    const bracesOriginals = {
      'SO38542': 25600000,
      'SO28111': 20700000,
      'SO30301': 26680000,
      'SO30871': 26680000,
      'SO37231': 22800000,
      'SO50374': 30500000,
      'SO38473': 28400000,
      'SO41386': 23200000,
      'SO45575': 22500000,
      'SO48525': 23500000
    };

    const partnerRefs = ['T049843','T050355','T045937','T046059','11252','T054935','T051377','T048631','T053016','T045156'];
    
    // Get all saleorders for these 10 patients
    const soResult = await client.query(
      `SELECT so.id, so.code, so.amounttotal, so.totalpaid, so.residual, p.id as partner_id, p.ref, p.name
       FROM dbo.saleorders so
       JOIN dbo.partners p ON so.partnerid = p.id
       WHERE p.ref = ANY($1)
       ORDER BY p.ref, so.code`,
      [partnerRefs]
    );
    
    // Identify which saleorders had payments (totalpaid > 0 OR braces with original amount > 0)
    const saleordersWithPayments = soResult.rows.filter(so => {
      const isBraces = bracesOriginals[so.code] !== undefined;
      const hasPayment = parseInt(so.totalpaid) > 0 || (isBraces && bracesOriginals[so.code] > 0);
      return hasPayment;
    });
    
    console.log(`Found ${saleordersWithPayments.length} saleorders that had payments`);
    
    // Generate payment amounts
    const paymentsToInsert = saleordersWithPayments.map(so => {
      const isBraces = bracesOriginals[so.code] !== undefined;
      const amount = isBraces ? bracesOriginals[so.code] : parseInt(so.totalpaid);
      return {
        order_code: so.code,
        partner_id: so.partner_id,
        ref: so.ref,
        amount: amount,
        is_braces: isBraces
      };
    });
    
    console.log('Payment breakdown:');
    let total = 0;
    let bracesTotal = 0;
    let otherTotal = 0;
    for (const p of paymentsToInsert) {
      total += p.amount;
      if (p.is_braces) bracesTotal += p.amount; else otherTotal += p.amount;
      console.log(`  ${p.order_code} | ${p.ref} | ${p.amount.toLocaleString()} | ${p.is_braces ? 'BRACES' : 'OTHER'}`);
    }
    console.log(`\nTotal: ${total.toLocaleString()} (Braces: ${bracesTotal.toLocaleString()}, Other: ${otherTotal.toLocaleString()})`);
    
    // Now insert on live database
    // First, connect to live
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);

const { Client } = require('pg');
const REAL_DB_URL = process.env.REAL_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:55433/tdental_real';
const DEMO_DB_URL = process.env.DEMO_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo';

async function audit(url, label) {
  const client = new Client({ connectionString: url });
  await client.connect();

  // Get partners columns
  const { rows: cols } = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'dbo' AND table_name = 'partners'
    ORDER BY ordinal_position
  `);
  console.log(`=== ${label} PARTNERS COLUMNS ===`);
  console.log(cols.map(c => c.column_name).join(', '));

  // Find AnhVL in partners
  const { rows: partners } = await client.query(`
    SELECT p.id, p.name, p.companyid, p.employee, p.customer, p.active, c.name as company_name
    FROM dbo.partners p
    LEFT JOIN dbo.companies c ON p.companyid = c.id
    WHERE p.name ILIKE '%anhvl%sale%'
       OR p.name ILIKE '%anhvl%online%'
    ORDER BY p.name, c.name
  `);
  console.log(`=== ${label} PARTNERS MATCHING ANHVL ===`);
  console.table(partners);

  await client.end();
}

async function main() {
  await audit(REAL_DB_URL, 'REAL');
  await audit(DEMO_DB_URL, 'DEMO');
}

main().catch(console.error);

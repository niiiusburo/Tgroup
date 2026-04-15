const { Client } = require('pg');
const REAL_DB_URL = process.env.REAL_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:55433/tdental_real';

async function main() {
  const client = new Client({ connectionString: REAL_DB_URL });
  await client.connect();

  // Find employees matching AnhVL and sale/online
  const { rows: employees } = await client.query(`
    SELECT e.id, e.name, e.companyid, e.isdoctor, e.isassistant, e.isreceptionist,
           e.phone, e.email, e.wage, e.startworkdate, e.partnerid,
           c.name as company_name
    FROM dbo.employees e
    LEFT JOIN dbo.companies c ON e.companyid = c.id
    WHERE e.name ILIKE '%anhvl%sale%'
       OR e.name ILIKE '%anhvl%online%'
       OR e.name ILIKE '%sale%online%'
    ORDER BY e.name, c.name
  `);

  console.log('=== EMPLOYEES MATCHING CRITERIA ===');
  console.table(employees);

  // Also check partners table
  const { rows: partners } = await client.query(`
    SELECT p.id, p.name, p.companyid, p.isdoctor, p.isassistant, p.isreceptionist,
           p.employee, p.customer, p.active, c.name as company_name
    FROM dbo.partners p
    LEFT JOIN dbo.companies c ON p.companyid = c.id
    WHERE p.name ILIKE '%anhvl%sale%'
       OR p.name ILIKE '%anhvl%online%'
    ORDER BY p.name, c.name
  `);

  console.log('=== PARTNERS MATCHING CRITERIA ===');
  console.table(partners);

  // Check if there's a location_scope column or separate table for employee locations
  const { rows: scopeCols } = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'dbo' AND table_name = 'employees' AND column_name ILIKE '%scope%'
  `);
  console.log('Employee scope columns:', scopeCols);

  const { rows: partnerScopeCols } = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'dbo' AND table_name = 'partners' AND column_name ILIKE '%scope%'
  `);
  console.log('Partner scope columns:', partnerScopeCols);

  await client.end();
}

main().catch(console.error);

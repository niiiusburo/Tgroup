const { Client } = require('pg');
const REAL_DB_URL = process.env.REAL_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:55433/tdental_real';

const ANHVL_PARTNER_IDS = [
  '4af9cd40-b26c-4a5a-aab0-b2c70065a7d8',
  'bee8bf91-f1c9-4e14-83fc-b16900309b37',
  '327b1346-5940-49eb-bfdc-b15d00795307',
  '8a21a554-5cc9-46af-aaa0-b15d007953a3',
  'e8a88ec0-9cf2-4e3e-8ca1-b169003089bb',
  '6ad9b0e0-1c70-4d17-9b53-b1690030af9f',
];

async function main() {
  const client = new Client({ connectionString: REAL_DB_URL });
  await client.connect();

  // Check employee_location_scope existence
  const { rows: scopeExists } = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'dbo' AND table_name = 'employee_location_scope'
    ) as exists
  `);
  console.log('employee_location_scope exists:', scopeExists[0].exists);

  if (scopeExists[0].exists) {
    const { rows: scopes } = await client.query(`
      SELECT * FROM dbo.employee_location_scope 
      WHERE employee_id = ANY($1)
    `, [ANHVL_PARTNER_IDS]);
    console.log('Location scopes:', scopes);
  }

  // Find employees linked to these partners
  const { rows: employees } = await client.query(`
    SELECT * FROM dbo.employees WHERE partnerid = ANY($1)
  `, [ANHVL_PARTNER_IDS]);
  console.log('Linked employees:');
  console.table(employees);

  // Find references in various tables
  const tablesToCheck = [
    { table: 'saleorders', cols: ['doctorid', 'assistantid', 'dentalaideid'] },
    { table: 'appointments', cols: ['doctorid'] },
    { table: 'saleorderlines', cols: ['employeeid', 'assistantid', 'counselorid'] },
    { table: 'partners', cols: ['marketingstaffid'] },
  ];

  for (const { table, cols } of tablesToCheck) {
    for (const col of cols) {
      const { rows } = await client.query(`
        SELECT COUNT(*) as cnt FROM dbo.${table} WHERE ${col} = ANY($1)
      `, [ANHVL_PARTNER_IDS]);
      if (parseInt(rows[0].cnt) > 0) {
        console.log(`${table}.${col}: ${rows[0].cnt} references`);
        const { rows: breakdown } = await client.query(`
          SELECT ${col}, COUNT(*) as cnt FROM dbo.${table} WHERE ${col} = ANY($1) GROUP BY ${col}
        `, [ANHVL_PARTNER_IDS]);
        console.table(breakdown);
      }
    }
  }

  // All FK references to partners
  const { rows: fkCols } = await client.query(`
    SELECT 
      tc.table_name, 
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND ccu.table_name = 'partners'
      AND tc.table_schema = 'dbo'
  `);
  console.log('\nAll FK references to partners:');
  console.table(fkCols);

  await client.end();
}

main().catch(console.error);

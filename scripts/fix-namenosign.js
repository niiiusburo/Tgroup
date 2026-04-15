const { query } = require('../api/src/db');

function normalizeVietnamese(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

async function main() {
  const rows = await query(`SELECT id, name, namenosign FROM dbo.products WHERE namenosign IS NOT NULL`);
  console.log(`Found ${rows.length} products to check`);
  let updated = 0;
  for (const row of rows) {
    const expected = normalizeVietnamese(row.name);
    if (row.namenosign !== expected) {
      await query(`UPDATE dbo.products SET namenosign = $1 WHERE id = $2`, [expected, row.id]);
      updated++;
    }
  }
  console.log(`Updated ${updated} products`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

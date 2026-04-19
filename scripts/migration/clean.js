/**
 * Data Cleaning Module
 * Fixes known data quality issues before migration
 */

const { sourcePool, CLEANING_RULES } = require('./config');

/**
 * Fix dummy UUID references by either:
 * 1. Mapping to a valid existing ID
 * 2. Creating placeholder records
 * 3. Setting to NULL where allowed
 */
async function fixDummyUuids(strategy = 'nullify') {
  const fixes = [];
  const client = await sourcePool.connect();

  try {
    await client.query('BEGIN');

    for (const { table, column } of CLEANING_RULES.dummyUuidColumns) {
      // Check if column allows NULL
      const nullCheck = await client.query(
        `SELECT is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'dbo'
           AND table_name = $1
           AND column_name = $2`,
        [table, column]
      );
      const isNullable = nullCheck.rows[0]?.is_nullable === 'YES';

      if (strategy === 'nullify' && isNullable) {
        const res = await client.query(
          `UPDATE dbo.${table}
           SET ${column} = NULL
           WHERE ${column} = $1
           RETURNING id`,
          [CLEANING_RULES.dummyUuid]
        );
        fixes.push({ table, column, action: 'nullify', count: res.rowCount });
      } else if (strategy === 'placeholder') {
        // Create a placeholder partner/company if needed
        // This is more complex and requires domain knowledge
        fixes.push({ table, column, action: 'placeholder_skipped', count: 0 });
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return fixes;
}

/**
 * Fix SO-2026 code series to be contiguous
 * Strategy: 'preserve' or 'resequence'
 */
async function fixSo2026Series(strategy = 'preserve') {
  const client = await sourcePool.connect();

  try {
    await client.query('BEGIN');

    if (strategy === 'resequence') {
      // Get all SO-2026 codes ordered by creation date
      const res = await client.query(
        `SELECT id, code, created_at
         FROM dbo.saleorders
         WHERE code LIKE 'SO-2026-%'
         ORDER BY created_at, code`
      );

      // Renumber them contiguously
      for (let i = 0; i < res.rows.length; i++) {
        const newCode = `SO-2026-${String(i + 1).padStart(4, '0')}`;
        if (res.rows[i].code !== newCode) {
          await client.query(
            `UPDATE dbo.saleorders SET code = $1 WHERE id = $2`,
            [newCode, res.rows[i].id]
          );
        }
      }

      await client.query('COMMIT');
      return { action: 'resequence', count: res.rows.length };
    } else {
      // Just update the sequence to max+1
      const maxRes = await client.query(
        `SELECT MAX(CAST(SUBSTRING(code FROM 8) AS INTEGER)) as max_num
         FROM dbo.saleorders WHERE code LIKE 'SO-2026-%'`
      );
      const maxNum = parseInt(maxRes.rows[0]?.max_num) || 0;

      await client.query('COMMIT');
      return { action: 'preserve', maxNumber: maxNum, nextSequence: maxNum + 1 };
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Run all cleaning operations
 */
async function runCleaning(options = {}) {
  console.log('🧹 Running data cleaning...\n');

  const results = {
    dummyUuidFixes: await fixDummyUuids(options.dummyUuidStrategy || 'nullify'),
    so2026Fix: await fixSo2026Series(options.so2026Strategy || 'preserve'),
  };

  console.log('✅ Data cleaning complete');
  console.log('   Dummy UUID fixes:', results.dummyUuidFixes);
  console.log('   SO-2026 fix:', results.so2026Fix);

  return results;
}

module.exports = {
  fixDummyUuids,
  fixSo2026Series,
  runCleaning,
};

'use strict';

const crypto = require('crypto');
const { Client } = require('pg');
const { validateAllocationResidual } = require('../src/routes/payments/helpers');

const connectionString = process.env.TEST_DATABASE_URL;
const describeWithDatabase = connectionString ? describe : describe.skip;

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function connectToSchema(schema) {
  const client = new Client({ connectionString });
  await client.connect();
  await client.query(`SET search_path TO ${schema}`);
  return client;
}

describeWithDatabase('payment allocation PostgreSQL concurrency matrix', () => {
  jest.setTimeout(15000);

  const schema = `payment_lock_${process.pid}_${Date.now()}`;
  let admin;

  beforeAll(async () => {
    admin = new Client({ connectionString });
    await admin.connect();
    await admin.query(`CREATE SCHEMA ${schema}`);
    await admin.query(
      `CREATE TABLE ${schema}.saleorders (
        id uuid PRIMARY KEY,
        residual numeric NOT NULL
      )`,
    );
    await admin.query(
      `CREATE TABLE ${schema}.dotkhams (
        id uuid PRIMARY KEY,
        amountresidual numeric NOT NULL
      )`,
    );
  });

  afterAll(async () => {
    if (!admin) return;
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
  });

  it.each([
    {
      label: 'invoice',
      table: 'saleorders',
      column: 'residual',
      allocationKey: 'invoice_id',
    },
    {
      label: 'dotkham',
      table: 'dotkhams',
      column: 'amountresidual',
      allocationKey: 'dotkham_id',
    },
  ])('serializes overlapping $label allocations and rejects the stale contender', async ({
    table,
    column,
    allocationKey,
  }) => {
    const targetId = crypto.randomUUID();
    await admin.query(
      `INSERT INTO ${schema}.${table} (id, ${column}) VALUES ($1, $2)`,
      [targetId, 100],
    );

    const firstClient = await connectToSchema(schema);
    const secondClient = await connectToSchema(schema);
    const firstLocked = deferred();
    const releaseFirst = deferred();
    let firstWork;
    let secondWork;
    let secondSettled = false;

    try {
      firstWork = (async () => {
        await firstClient.query('BEGIN');
        const error = await validateAllocationResidual(
          [{ [allocationKey]: targetId, allocated_amount: 60 }],
          firstClient,
          60,
        );
        if (error) throw new Error(error);
        firstLocked.resolve();
        await releaseFirst.promise;
        await firstClient.query(
          `UPDATE ${table} SET ${column} = ${column} - $1 WHERE id = $2`,
          [60, targetId],
        );
        await firstClient.query('COMMIT');
        return null;
      })();

      await firstLocked.promise;

      secondWork = (async () => {
        await secondClient.query('BEGIN');
        const error = await validateAllocationResidual(
          [{ [allocationKey]: targetId, allocated_amount: 60 }],
          secondClient,
          60,
        );
        if (error) {
          await secondClient.query('ROLLBACK');
          return error;
        }
        await secondClient.query(
          `UPDATE ${table} SET ${column} = ${column} - $1 WHERE id = $2`,
          [60, targetId],
        );
        await secondClient.query('COMMIT');
        return null;
      })().finally(() => {
        secondSettled = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 75));
      expect(secondSettled).toBe(false);

      releaseFirst.resolve();
      await expect(firstWork).resolves.toBeNull();
      await expect(secondWork).resolves.toMatch(/exceeds outstanding balance/i);

      const finalRows = await admin.query(
        `SELECT ${column} AS residual FROM ${schema}.${table} WHERE id = $1`,
        [targetId],
      );
      expect(Number(finalRows.rows[0].residual)).toBe(40);
    } finally {
      releaseFirst.resolve();
      await Promise.allSettled([firstWork, secondWork].filter(Boolean));
      await firstClient.end();
      await secondClient.end();
    }
  });
});

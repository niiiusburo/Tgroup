// PgUpserter — batched INSERT ... ON CONFLICT (id) DO UPDATE SET ... = EXCLUDED.*
import pg from 'pg';
import type { PgRow, SyncConfig, UpsertResult } from './types.js';

type PgConfigSubset = SyncConfig['pg'];
const BATCH_SIZE = 500;

export class PgUpserter {
  private pool: pg.Pool;
  private schema: string;

  constructor(cfg: PgConfigSubset) {
    this.pool = new pg.Pool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      max: 5,
    });
    this.schema = cfg.schema;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async rowCount(table: string): Promise<number> {
    const q = `SELECT COUNT(*)::bigint AS c FROM ${this.quoteIdent(this.schema)}.${this.quoteIdent(table)}`;
    const { rows } = await this.pool.query(q);
    return Number((rows[0] as any)?.c ?? 0);
  }

  async maxDate(table: string, column: string): Promise<Date | null> {
    const q = `SELECT MAX(${this.quoteIdent(column)}) AS m FROM ${this.quoteIdent(this.schema)}.${this.quoteIdent(table)}`;
    try {
      const { rows } = await this.pool.query(q);
      const m = (rows[0] as any)?.m;
      return m ? new Date(m) : null;
    } catch {
      return null;
    }
  }

  async describeColumns(table: string): Promise<Set<string>> {
    const q = `
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
    `;
    const { rows } = await this.pool.query(q, [this.schema, table]);
    return new Set(rows.map((r: any) => r.column_name));
  }

  private quoteIdent(name: string): string {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return `"${name.replace(/"/g, '""')}"`;
    }
    return `"${name}"`;
  }

  private buildUpsertSql(
    table: string,
    columns: string[],
    rowCount: number,
    idField: string,
  ): string {
    const quotedCols = columns.map((c) => this.quoteIdent(c));
    const placeholders: string[] = [];
    let p = 1;
    for (let i = 0; i < rowCount; i++) {
      const row = columns.map(() => `$${p++}`);
      placeholders.push(`(${row.join(', ')})`);
    }
    const updateSet = columns
      .filter((c) => c !== idField)
      .map((c) => `${this.quoteIdent(c)} = EXCLUDED.${this.quoteIdent(c)}`)
      .join(', ');

    const schemaDotTable = `${this.quoteIdent(this.schema)}.${this.quoteIdent(table)}`;

    if (!updateSet) {
      return `INSERT INTO ${schemaDotTable} (${quotedCols.join(', ')}) VALUES ${placeholders.join(', ')} ON CONFLICT (${this.quoteIdent(idField)}) DO NOTHING RETURNING (xmax = 0) AS inserted`;
    }
    return (
      `INSERT INTO ${schemaDotTable} (${quotedCols.join(', ')}) ` +
      `VALUES ${placeholders.join(', ')} ` +
      `ON CONFLICT (${this.quoteIdent(idField)}) DO UPDATE SET ${updateSet} ` +
      `RETURNING (xmax = 0) AS inserted`
    );
  }

  async upsert(
    table: string,
    rows: PgRow[],
    idField: string,
    opts: { dryRun?: boolean; allowedColumns?: Set<string> } = {},
  ): Promise<UpsertResult> {
    if (rows.length === 0) return { inserted: 0, updated: 0, skipped: 0 };

    const allKeys = new Set<string>();
    for (const r of rows) for (const k of Object.keys(r)) allKeys.add(k);

    let columns = Array.from(allKeys);
    if (opts.allowedColumns) {
      columns = columns.filter((c) => opts.allowedColumns!.has(c));
    }
    if (!columns.includes(idField)) {
      throw new Error(`PgUpserter: rows for '${table}' missing id field '${idField}'`);
    }

    if (opts.dryRun) {
      return { inserted: 0, updated: 0, skipped: rows.length };
    }

    let inserted = 0;
    let updated = 0;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const params: unknown[] = [];
        for (const row of batch) {
          for (const c of columns) {
            const v = row[c];
            params.push(v === undefined ? null : v);
          }
        }
        const sql = this.buildUpsertSql(table, columns, batch.length, idField);
        const res = await client.query(sql, params);
        for (const r of res.rows as any[]) {
          if (r.inserted) inserted++;
          else updated++;
        }
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }

    return { inserted, updated, skipped: 0 };
  }
}

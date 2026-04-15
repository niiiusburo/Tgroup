// SyncOrchestrator — drives the full flow: auth -> topo-order -> per table fetch/map/upsert.
import fs from 'node:fs';
import path from 'node:path';
import { captureAuth } from './authCapture.js';
import { ApiClient } from './apiClient.js';
import { EndpointMap, SKIP_TABLES } from './endpointMap.js';
import { mapRows } from './fieldMapper.js';
import { PgUpserter } from './pgUpserter.js';
import { writeReport } from './syncReport.js';
import type {
  AuthResult,
  EndpointEntry,
  MappingError,
  PgRow,
  RunState,
  SyncConfig,
  TableCheckpoint,
  UpsertResult,
  WindowStrategy,
} from './types.js';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function makeRunId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function buildBaseQuery(
  entry: EndpointEntry,
  windowFrom: string | null,
  windowTo: string | null,
): Record<string, string | number | boolean | undefined> {
  const q: Record<string, string | number | boolean | undefined> = {};
  for (const p of entry.required_query_params ?? []) {
    const [k, v] = p.split('=');
    if (k && v !== undefined) q[k] = v;
  }
  const df = entry.delta_filter;
  if (df?.supported && df.param && windowFrom) {
    q[df.param] = windowFrom;
    if (df.companion_param && windowTo) {
      const cp = df.companion_param.split(/\s/)[0];
      q[cp] = windowTo;
    }
  }
  return q;
}

async function fetchAll(
  api: ApiClient,
  entry: EndpointEntry,
  baseQuery: Record<string, string | number | boolean | undefined>,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  for await (const page of api.fetchAllPages(entry, baseQuery)) {
    rows.push(...page);
  }
  return rows;
}

async function fetchByStrategy(
  api: ApiClient,
  entry: EndpointEntry,
  strategy: WindowStrategy,
  cfg: SyncConfig,
): Promise<unknown[]> {
  const since = cfg.sync.since;
  const today = todayISO();
  const futureEnd = addDaysISO(today, cfg.sync.appointmentsFutureDays);

  switch (strategy) {
    case 'all':
      return fetchAll(api, entry, buildBaseQuery(entry, null, null));
    case 'single':
      return fetchAll(api, entry, buildBaseQuery(entry, since, today));
    case 'paired':
      return fetchAll(api, entry, buildBaseQuery(entry, since, today));
    case 'two-pass': {
      const pastRows = await fetchAll(api, entry, buildBaseQuery(entry, since, today));
      const futureRows = await fetchAll(api, entry, buildBaseQuery(entry, today, futureEnd));
      const seen = new Set<string>();
      const merged: unknown[] = [];
      for (const r of [...pastRows, ...futureRows]) {
        const id = (r as { id?: unknown })?.id;
        if (typeof id === 'string') {
          if (seen.has(id)) continue;
          seen.add(id);
        }
        merged.push(r);
      }
      return merged;
    }
    case 'detail-follow': {
      const list = await fetchAll(api, entry, buildBaseQuery(entry, since, today));
      if (!entry.fat_detail_url) return list;
      const fat: unknown[] = [];
      for (const item of list) {
        const id = (item as { id?: string })?.id;
        if (!id || typeof id !== 'string') continue;
        const url = entry.fat_detail_url.replace('{id}', encodeURIComponent(id));
        try {
          const detail = await api.get(url);
          fat.push(detail);
        } catch (e) {
          if (cfg.cli.debug) console.warn(`[partners] detail fetch failed for ${id}: ${(e as Error).message}`);
          fat.push(item);
        }
      }
      return fat;
    }
    default:
      throw new Error(`SyncOrchestrator: unknown window strategy '${strategy}'`);
  }
}

function deriveDotKhamSteps(saleOrderLines: unknown[]): unknown[] {
  const steps: unknown[] = [];
  for (const line of saleOrderLines) {
    const l = line as { steps?: unknown[]; orderId?: string; id?: string };
    if (!Array.isArray(l.steps)) continue;
    for (const step of l.steps) {
      const s = step as Record<string, unknown>;
      steps.push({
        ...s,
        saleLineId: s.saleLineId ?? l.id,
        saleOrderId: s.saleOrderId ?? l.orderId,
      });
    }
  }
  return steps;
}

function appendErrors(projectRoot: string, runId: string, errors: MappingError[]): void {
  if (errors.length === 0) return;
  const file = path.join(projectRoot, `sync-errors-${runId}.jsonl`);
  const lines = errors.map((e) => JSON.stringify(e)).join('\n') + '\n';
  fs.appendFileSync(file, lines, 'utf8');
}

function loadState(projectRoot: string): RunState | null {
  const file = path.join(projectRoot, 'state.json');
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as RunState;
  } catch {
    return null;
  }
}

function saveState(projectRoot: string, state: RunState): void {
  const file = path.join(projectRoot, 'state.json');
  fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf8');
}

export async function runSync(cfg: SyncConfig): Promise<{ reportPath: string | null; state: RunState }> {
  const endpointMapPath = path.join(cfg.projectRoot, 'endpoint-map.json');
  if (!fs.existsSync(endpointMapPath)) {
    throw new Error(`syncOrchestrator: missing endpoint-map.json at ${endpointMapPath}`);
  }
  const map = EndpointMap.load(endpointMapPath);

  const allTables = map.orderedTables();
  const onlyFilter = cfg.cli.only;
  const tables = allTables.filter(
    (t) => !SKIP_TABLES.has(t) && (!onlyFilter || onlyFilter.includes(t)),
  );

  if (tables.length === 0) {
    console.warn('[sync] no tables selected (after --only and skip filters). Nothing to do.');
    return { reportPath: null, state: { runId: makeRunId(), since: cfg.sync.since, startedAt: new Date().toISOString(), tables: {} } };
  }

  let state: RunState;
  if (cfg.cli.resume) {
    const loaded = loadState(cfg.projectRoot);
    state = loaded ?? {
      runId: makeRunId(),
      since: cfg.sync.since,
      startedAt: new Date().toISOString(),
      tables: {},
    };
    if (loaded) console.log(`[sync] resuming run ${state.runId}`);
  } else {
    state = {
      runId: makeRunId(),
      since: cfg.sync.since,
      startedAt: new Date().toISOString(),
      tables: {},
    };
  }

  console.log(`[auth] logging into ${cfg.tdental.baseUrl} as ${cfg.tdental.user}...`);
  const auth: AuthResult = await captureAuth(cfg);
  console.log(`[auth] OK. Token expires ${auth.tokenExpiry.toISOString()}.`);

  const api = new ApiClient(auth, cfg);
  const upserter = new PgUpserter(cfg.pg);

  const pgBefore: Record<string, number> = {};
  const pgAfter: Record<string, number> = {};

  try {
    for (const t of tables) {
      try {
        pgBefore[t] = await upserter.rowCount(t);
      } catch (e) {
        console.warn(`[pg] rowCount(${t}) failed: ${(e as Error).message}`);
        pgBefore[t] = -1;
      }
    }

    let lastSaleOrderLines: unknown[] | null = null;

    for (const table of tables) {
      if (cfg.cli.resume && state.tables[table]) {
        console.log(`[${table}] already in checkpoint, skipping.`);
        continue;
      }
      const started = Date.now();
      const entry = map.get(table);
      console.log(`\n[${table}] fetching strategy=${entry.windowStrategy} since=${cfg.sync.since}`);

      const apiRows = await fetchByStrategy(api, entry, entry.windowStrategy, cfg);
      console.log(`[${table}] fetched ${apiRows.length} rows`);

      if (table === 'saleorderlines') lastSaleOrderLines = apiRows;

      const allowedColumns = await upserter.describeColumns(table).catch(() => new Set<string>());
      const { pgRows, errors } = mapRows(table, apiRows);
      const cleaned: PgRow[] = pgRows.map((row) => {
        const out: PgRow = {};
        for (const [k, v] of Object.entries(row)) {
          if (allowedColumns.size === 0 || allowedColumns.has(k)) out[k] = v;
        }
        return out;
      });
      appendErrors(cfg.projectRoot, state.runId, errors);

      // Debug: show first mapped row for dry-run + debug
      if (cfg.cli.debug && cleaned.length > 0) {
        console.log(`[${table}] sample mapped row: ${JSON.stringify(cleaned[0], null, 2)}`);
      }

      let result: UpsertResult;
      try {
        result = await upserter.upsert(table, cleaned, entry.id_field ?? 'id', {
          dryRun: cfg.cli.dryRun,
        });
      } catch (e) {
        throw new Error(`[${table}] upsert failed: ${(e as Error).message}`);
      }
      const elapsed = Date.now() - started;

      const checkpoint: TableCheckpoint = {
        table,
        completedAt: new Date().toISOString(),
        fetched: apiRows.length,
        inserted: result.inserted,
        updated: result.updated,
        errored: errors.length,
        elapsedMs: elapsed,
      };
      state.tables[table] = checkpoint;
      saveState(cfg.projectRoot, state);

      console.log(
        `[${table}] ${cfg.cli.dryRun ? 'DRY-RUN' : 'done'}: fetched=${apiRows.length} inserted=${result.inserted} updated=${result.updated} errored=${errors.length} in ${fmtMs(elapsed)}`,
      );

      try {
        pgAfter[table] = await upserter.rowCount(table);
      } catch {
        pgAfter[table] = pgBefore[table];
      }
    }

    const wantsDotKhamSteps = !onlyFilter || onlyFilter.includes('dotkhamsteps');
    if (wantsDotKhamSteps && lastSaleOrderLines && lastSaleOrderLines.length > 0) {
      const started = Date.now();
      const derived = deriveDotKhamSteps(lastSaleOrderLines);
      console.log(`\n[dotkhamsteps] derived ${derived.length} rows from saleorderlines.steps[]`);
      const allowedColumns = await upserter.describeColumns('dotkhamsteps').catch(() => new Set<string>());
      const { pgRows, errors } = mapRows('dotkhamsteps', derived);
      const cleaned: PgRow[] = pgRows.map((row) => {
        const out: PgRow = {};
        for (const [k, v] of Object.entries(row)) {
          if (allowedColumns.size === 0 || allowedColumns.has(k)) out[k] = v;
        }
        return out;
      });
      appendErrors(cfg.projectRoot, state.runId, errors);
      try {
        const result = await upserter.upsert('dotkhamsteps', cleaned, 'id', { dryRun: cfg.cli.dryRun });
        state.tables['dotkhamsteps'] = {
          table: 'dotkhamsteps',
          completedAt: new Date().toISOString(),
          fetched: derived.length,
          inserted: result.inserted,
          updated: result.updated,
          errored: errors.length,
          elapsedMs: Date.now() - started,
        };
        saveState(cfg.projectRoot, state);
        console.log(`[dotkhamsteps] ${cfg.cli.dryRun ? 'DRY-RUN' : 'done'}: inserted=${result.inserted} updated=${result.updated}`);
      } catch (e) {
        console.warn(`[dotkhamsteps] upsert failed (non-fatal): ${(e as Error).message}`);
      }
    }

    const reportPath = writeReport(cfg.projectRoot, state, { pgBefore, pgAfter, dryRun: cfg.cli.dryRun });
    console.log(`\n[report] wrote ${reportPath}`);
    return { reportPath, state };
  } finally {
    await upserter.close().catch(() => undefined);
  }
}

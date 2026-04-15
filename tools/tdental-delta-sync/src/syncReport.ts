// SyncReport — writes a markdown summary at end of run.
import fs from 'node:fs';
import path from 'node:path';
import type { RunState, TableCheckpoint } from './types.js';

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}m ${r.toFixed(1)}s`;
}

export function writeReport(
  projectRoot: string,
  state: RunState,
  extras: {
    pgBefore: Record<string, number>;
    pgAfter: Record<string, number>;
    dryRun: boolean;
  },
): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(projectRoot, `sync-report-${ts}.md`);

  const tables = Object.values(state.tables) as TableCheckpoint[];
  const totalElapsed = tables.reduce((a, b) => a + b.elapsedMs, 0);

  let md = `# TDental Delta Sync — Run ${state.runId}\n\n`;
  md += `- Started: ${state.startedAt}\n`;
  md += `- Finished: ${new Date().toISOString()}\n`;
  md += `- Since: ${state.since}\n`;
  md += `- Mode: ${extras.dryRun ? '**DRY RUN** (no writes)' : 'live'}\n`;
  md += `- Total elapsed: ${fmtDuration(totalElapsed)}\n\n`;

  md += `## Per-table summary\n\n`;
  md += `| Table | Fetched | Inserted | Updated | Errored | Elapsed | PG before | PG after |\n`;
  md += `|---|---:|---:|---:|---:|---:|---:|---:|\n`;
  for (const t of tables) {
    md += `| ${t.table} | ${t.fetched} | ${t.inserted} | ${t.updated} | ${t.errored} | ${fmtDuration(t.elapsedMs)} | ${extras.pgBefore[t.table] ?? '\u2014'} | ${extras.pgAfter[t.table] ?? '\u2014'} |\n`;
  }
  md += `\n`;

  fs.writeFileSync(file, md, 'utf8');
  return file;
}

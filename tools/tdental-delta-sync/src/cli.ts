#!/usr/bin/env node
// CLI entry for tdental-delta-sync.
import { loadConfig, type CliFlags } from './config.js';
import { runSync } from './syncOrchestrator.js';

const HELP = `
tdental-delta-sync — top up local tdental_real from tamdentist.tdental.vn

Usage:
  npx tsx src/cli.ts [flags]

Flags:
  --dry-run                fetch + map only, no DB writes
  --only=a,b,c             run only these tables (comma-separated)
  --since=YYYY-MM-DD       override default cutoff (default: SYNC_SINCE env or 2026-02-22)
  --resume                 skip tables with an existing checkpoint in state.json
  --debug                  print HTTP + SQL progress to stderr
  --help                   show this message

Examples:
  npx tsx src/cli.ts --dry-run --only=companies --debug
  npx tsx src/cli.ts --since=2026-04-01 --resume
  npx tsx src/cli.ts
`;

function parseFlags(argv: string[]): CliFlags {
  const flags: CliFlags = {
    dryRun: false,
    only: null,
    since: null,
    resume: false,
    debug: false,
    help: false,
  };
  for (const arg of argv.slice(2)) {
    if (arg === '--help' || arg === '-h') flags.help = true;
    else if (arg === '--dry-run') flags.dryRun = true;
    else if (arg === '--resume') flags.resume = true;
    else if (arg === '--debug') flags.debug = true;
    else if (arg.startsWith('--only=')) {
      const v = arg.slice('--only='.length).trim();
      flags.only = v ? v.split(',').map((s) => s.trim()).filter(Boolean) : null;
    } else if (arg.startsWith('--since=')) {
      const v = arg.slice('--since='.length).trim();
      flags.since = v || null;
    } else {
      throw new Error(`Unknown flag: ${arg}. Try --help.`);
    }
  }
  return flags;
}

async function main(): Promise<void> {
  let flags: CliFlags;
  try {
    flags = parseFlags(process.argv);
  } catch (e) {
    console.error((e as Error).message);
    process.exit(2);
  }
  if (flags.help) {
    console.log(HELP);
    process.exit(0);
  }
  const cfg = loadConfig(flags);
  console.log(
    `[cli] since=${cfg.sync.since} dryRun=${cfg.cli.dryRun} only=${cfg.cli.only?.join(',') ?? '(all)'} resume=${cfg.cli.resume}`,
  );
  await runSync(cfg);
}

main().catch((e) => {
  console.error(`[fatal] ${(e as Error).stack ?? String(e)}`);
  process.exit(1);
});

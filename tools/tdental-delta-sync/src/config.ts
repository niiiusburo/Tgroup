import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SyncConfig } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function req(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required env var: ${name}. Copy .env.example to .env and fill it in.`);
  }
  return v;
}

function opt(name: string, dflt: string): string {
  const v = process.env[name];
  return v && v.trim() !== '' ? v : dflt;
}

export interface CliFlags {
  dryRun: boolean;
  only: string[] | null;
  since: string | null;
  resume: boolean;
  debug: boolean;
  help: boolean;
}

export function loadConfig(flags: CliFlags): SyncConfig {
  const projectRoot = path.resolve(__dirname, '..');

  const sinceFromFlag = flags.since;
  const since = sinceFromFlag && /^\d{4}-\d{2}-\d{2}$/.test(sinceFromFlag)
    ? sinceFromFlag
    : opt('SYNC_SINCE', '2026-02-22');

  const cfg: SyncConfig = {
    tdental: {
      baseUrl: opt('TDENTAL_BASE_URL', 'https://tamdentist.tdental.vn').replace(/\/$/, ''),
      tenant: opt('TDENTAL_TENANT', 'tamdentist'),
      user: req('TDENTAL_USER'),
      pass: req('TDENTAL_PASS'),
    },
    pg: {
      host: opt('PG_HOST', '127.0.0.1'),
      port: Number(opt('PG_PORT', '55433')),
      user: opt('PG_USER', 'postgres'),
      password: opt('PG_PASSWORD', 'postgres'),
      database: opt('PG_DATABASE', 'tdental_real'),
      schema: opt('PG_SCHEMA', 'dbo'),
    },
    sync: {
      since,
      throttleMs: Number(opt('SYNC_THROTTLE_MS', '400')),
      pageSize: Number(opt('SYNC_PAGE_SIZE', '200')),
      maxRetries: Number(opt('SYNC_MAX_RETRIES', '5')),
      appointmentsFutureDays: Number(opt('APPOINTMENTS_FUTURE_DAYS', '730')),
    },
    cli: {
      dryRun: flags.dryRun,
      only: flags.only,
      resume: flags.resume,
      debug: flags.debug,
    },
    projectRoot,
  };

  if (cfg.pg.database !== 'tdental_real') {
    console.warn(`[config] WARNING: PG_DATABASE=${cfg.pg.database} (expected 'tdental_real'). Continuing.`);
  }

  return cfg;
}

#!/usr/bin/env node
'use strict';

/**
 * One-time backfill of MLM override earnings (level >= 1) for every EXISTING direct CTV
 * earning (level 0, source 'ctv'). Makes the CTV portal's projected "potential from downline"
 * into real pending commission. Idempotent (per payment/line/recipient/level) — safe to re-run.
 *
 * Runs against BOTH LOB DBs via the engine's getDb (DATABASE_URL + COSMETIC_DATABASE_URL).
 * Usage (inside the api container, which has the env):
 *   node scripts/backfill-ctv-overrides.js
 */

const { backfillOverridesForLob } = require('../src/services/commissionEngine');

(async () => {
  const lobs = ['dental', 'cosmetic'];
  let total = 0;
  for (const lob of lobs) {
    try {
      const r = await backfillOverridesForLob({ lob });
      console.log(
        `[override-backfill] ${lob}: scanned ${r.directRowsScanned} direct CTV earnings, created ${r.overridesCreated} override rows`
      );
      total += r.overridesCreated;
    } catch (e) {
      console.error(`[override-backfill] ${lob} FAILED:`, e && e.message ? e.message : e);
    }
  }
  console.log(`[override-backfill] done. total override rows created: ${total}`);
  process.exit(0);
})();

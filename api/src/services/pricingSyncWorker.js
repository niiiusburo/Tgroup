'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[api/src/server.js, api/src/routes/publicBangGia.js]
 * @crossref:uses[api/src/services/pricingSheetSync.js, api/src/services/googleSheetsClient.js, api/src/services/pricingSheetCategoryMap.js, product-map/domains/ctv.yaml]
 */

const cluster = require('cluster');
const { syncPricingFromGoogleSheet } = require('./pricingSheetSync');
const { hasGoogleCredentials } = require('./googleSheetsClient');
const {
  DEFAULT_PRICING_SHEET_ID,
  DEFAULT_PRICING_SHEET_URL,
} = require('./pricingSheetCategoryMap');

const DEFAULT_INTERVAL_MS = 30_000;

const fs = require('fs');
const path = require('path');

function statusFilePath() {
  const base = process.env.BANG_GIA_OUTPUT_DIR || path.resolve(__dirname, '../../../website/public/bang-gia');
  return path.join(base, 'data', 'pricing-sync-status.json');
}

function readPersistedStatus() {
  try {
    return JSON.parse(fs.readFileSync(statusFilePath(), 'utf8'));
  } catch {
    return null;
  }
}

function persistStatus(next) {
  try {
    const file = statusFilePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(next, null, 2), 'utf8');
  } catch (error) {
    console.warn('[pricing-sync] could not persist status:', error.message);
  }
}

let status = {
  enabled: false,
  running: false,
  lastSuccessAt: null,
  lastErrorAt: null,
  lastError: null,
  categoryCount: null,
  itemCount: null,
  updatedAt: null,
  sheetId: DEFAULT_PRICING_SHEET_ID,
  sheetUrl: DEFAULT_PRICING_SHEET_URL,
  intervalMs: DEFAULT_INTERVAL_MS,
};

let intervalHandle = null;
let syncInFlight = false;

function getPricingSyncStatus() {
  const persisted = readPersistedStatus();
  return { ...status, ...(persisted || {}) };
}

function shouldRunPricingSyncWorker() {
  if (process.env.PRICING_SYNC_ENABLED !== 'true') return false;
  if (process.env.NODE_ENV === 'test') return false;

  const workers = parseInt(process.env.WEB_CONCURRENCY || process.env.NODE_CLUSTER_WORKERS || '1', 10);
  if (workers <= 1) return true;
  // Node cluster worker ids start at 1 for the first forked worker.
  return cluster.isWorker && cluster.worker?.id === 1;
}

async function runPricingSyncOnce() {
  if (syncInFlight) {
    console.log('[pricing-sync] skip — previous sync still running');
    return;
  }

  syncInFlight = true;
  status.running = true;
  try {
    const result = await syncPricingFromGoogleSheet();
    status.lastSuccessAt = new Date().toISOString();
    status.lastError = null;
    status.categoryCount = result.categoryCount;
    status.itemCount = result.itemCount;
    status.updatedAt = result.updatedAt;
    status.sheetId = result.sheetId;
    console.log(
      `[pricing-sync] ok — ${result.categoryCount} categories, ${result.itemCount} items → ${result.outputDir}`,
    );
  } catch (error) {
    status.lastErrorAt = new Date().toISOString();
    status.lastError = error.message;
    console.error('[pricing-sync] failed:', error.message);
  } finally {
    status.running = false;
    syncInFlight = false;
    persistStatus(status);
  }
}

function startPricingSyncWorker() {
  if (!shouldRunPricingSyncWorker()) return null;

  if (!hasGoogleCredentials()) {
    console.warn('[pricing-sync] disabled — Google credentials not configured');
    return null;
  }

  const intervalMs = parseInt(process.env.PRICING_SYNC_INTERVAL_MS || String(DEFAULT_INTERVAL_MS), 10);
  status.enabled = true;
  status.intervalMs = Number.isFinite(intervalMs) && intervalMs >= 5000 ? intervalMs : DEFAULT_INTERVAL_MS;
  status.sheetId = process.env.PRICING_SHEET_ID || DEFAULT_PRICING_SHEET_ID;
  persistStatus(status);

  console.log(`[pricing-sync] starting — every ${status.intervalMs}ms, sheet ${status.sheetId}`);

  void runPricingSyncOnce();
  intervalHandle = setInterval(() => {
    void runPricingSyncOnce();
  }, status.intervalMs);

  if (typeof intervalHandle.unref === 'function') {
    intervalHandle.unref();
  }

  return intervalHandle;
}

function stopPricingSyncWorker() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  status.enabled = false;
}

module.exports = {
  startPricingSyncWorker,
  stopPricingSyncWorker,
  runPricingSyncOnce,
  getPricingSyncStatus,
  shouldRunPricingSyncWorker,
};
'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[api/src/services/pricingSyncWorker.js]
 * @crossref:uses[api/src/services/pricingSheetParse.js, api/src/services/bangGiaGenerator.js]
 */

const { parsePricingRows } = require('./pricingSheetParse');
const { writeBangGiaArtifacts } = require('./bangGiaGenerator');
const { createSheetsClient } = require('./googleSheetsClient');
const { DEFAULT_PRICING_SHEET_ID } = require('./pricingSheetCategoryMap');

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 5000;
const RETRYABLE_CODES = [429, 500, 503];

function isRetryableError(error) {
  const msg = String(error?.message || error);
  if (RETRYABLE_CODES.some((code) => msg.includes(String(code)))) return true;
  if (msg.includes('RemoteDisconnected') || msg.includes('Connection aborted')) return true;
  if (msg.includes('ServiceUnavailable') || msg.includes('Internal error')) return true;
  return false;
}

function formatUpdatedAt(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function fetchSheetRows(sheets, sheetId) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
      const firstSheet = meta.data.sheets?.[0]?.properties?.title;
      if (!firstSheet) throw new Error('Pricing sheet has no worksheets');

      const range = `'${firstSheet.replace(/'/g, "''")}'!A:Z`;
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
      if (attempt > 1) {
        console.log(`[pricing-sync] sheet fetch succeeded on attempt ${attempt}`);
      }
      return res.data.values || [];
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES && isRetryableError(error)) {
        const delay = RETRY_BASE_DELAY_MS * (3 ** (attempt - 1));
        console.warn(`[pricing-sync] fetch attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`);
        console.warn(`[pricing-sync] retrying in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

/**
 * Pull pricing from Google Sheets and write bang-gia artifacts (pricing.json + index.html).
 */
async function syncPricingFromGoogleSheet(options = {}) {
  const sheetId = options.sheetId || process.env.PRICING_SHEET_ID || DEFAULT_PRICING_SHEET_ID;
  const outputDir = options.outputDir;
  const sheets = options.sheetsClient || await createSheetsClient();

  const rows = await fetchSheetRows(sheets, sheetId);
  const categories = parsePricingRows(rows);
  if (categories.length === 0) {
    throw new Error('Pricing sync returned 0 categories');
  }

  const updatedAt = formatUpdatedAt();
  const result = writeBangGiaArtifacts({ outputDir, categories, updatedAt });

  return {
    ...result,
    sheetId,
  };
}

module.exports = {
  syncPricingFromGoogleSheet,
  fetchSheetRows,
  formatUpdatedAt,
};
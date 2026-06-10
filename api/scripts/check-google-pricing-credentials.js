#!/usr/bin/env node
'use strict';

/**
 * One-off probe: validate Google service account + pricing sheet access.
 * Safe output — never prints private_key.
 */

const fs = require('fs');
const { google } = require('googleapis');

const SHEET_ID = process.env.PRICING_SHEET_ID || '19YZB-SgpqvI3-hu93xOk0OCDWtUPxrAAfR6CiFpU4GY';
const credPath = process.env.GOOGLE_CREDENTIALS_FILE || '/secrets/google_credentials.json';

function fail(msg, extra = {}) {
  console.log(JSON.stringify({ valid: false, error: msg, ...extra }, null, 2));
  process.exit(1);
}

if (!fs.existsSync(credPath)) {
  fail(`credentials file missing: ${credPath}`);
}

let creds;
try {
  creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
} catch (e) {
  fail(`invalid JSON: ${e.message}`);
}

if (!creds.client_email) fail('missing client_email in credentials');
if (!creds.private_key) fail('missing private_key in credentials');

(async () => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const title = meta.data.properties?.title;
    const ws = meta.data.sheets?.[0]?.properties?.title;
    const safeWs = String(ws).replace(/'/g, "''");
    const sample = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `'${safeWs}'!A1:D3`,
    });

    console.log(JSON.stringify({
      valid: true,
      credentialsFile: credPath,
      serviceAccountEmail: creds.client_email,
      projectId: creds.project_id || null,
      sheetId: SHEET_ID,
      sheetTitle: title,
      worksheetTitle: ws,
      sampleRowCount: (sample.data.values || []).length,
      privateKeyPresent: Boolean(creds.private_key && creds.private_key.includes('BEGIN PRIVATE KEY')),
    }, null, 2));
  } catch (e) {
    const msg = e.message || String(e);
    console.log(JSON.stringify({
      valid: false,
      serviceAccountEmail: creds.client_email,
      sheetId: SHEET_ID,
      error: msg,
      hint: msg.includes('403') || msg.toLowerCase().includes('permission')
        ? 'Share the Google Sheet with the service account email above (Viewer is enough).'
        : msg.includes('404')
          ? 'Sheet ID may be wrong or deleted.'
          : null,
    }, null, 2));
    process.exit(1);
  }
})();
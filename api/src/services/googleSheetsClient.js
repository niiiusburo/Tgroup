'use strict';

/**
 * @crossref:domain[integrations]
 * @crossref:used-in[api/src/services/pricingSheetSync.js]
 * @crossref:uses[ctv2checkin/google_credentials.json service account pattern]
 */

const fs = require('fs');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

function loadCredentials() {
  const inline = process.env.GOOGLE_CREDENTIALS_JSON;
  if (inline) {
    return JSON.parse(inline);
  }

  const file = process.env.GOOGLE_CREDENTIALS_FILE;
  if (file && fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  return null;
}

function hasGoogleCredentials() {
  return Boolean(loadCredentials());
}

async function createSheetsClient() {
  const credentials = loadCredentials();
  if (!credentials) {
    throw new Error('Google credentials not configured (GOOGLE_CREDENTIALS_JSON or GOOGLE_CREDENTIALS_FILE)');
  }

  const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
  return google.sheets({ version: 'v4', auth });
}

module.exports = {
  createSheetsClient,
  hasGoogleCredentials,
  loadCredentials,
};
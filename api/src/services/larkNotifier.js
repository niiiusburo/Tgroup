'use strict';

const crypto = require('crypto');

const LARK_HOSTS = new Set(['open.larksuite.com', 'open.feishu.cn']);
const MAX_PREVIEW_LENGTH = 900;
const MAX_FIELD_LENGTH = 240;

function sanitizeSingleLine(value, fallback = 'Unknown') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  return text.length > MAX_FIELD_LENGTH ? `${text.slice(0, MAX_FIELD_LENGTH - 1)}...` : text;
}

function previewText(value) {
  const text = String(value || '').replace(/\r\n/g, '\n').trim();
  if (!text) return '(no text content)';
  return text.length > MAX_PREVIEW_LENGTH ? `${text.slice(0, MAX_PREVIEW_LENGTH - 1)}...` : text;
}

function getWebhookUrl(rawUrl = process.env.LARK_FEEDBACK_WEBHOOK_URL) {
  const value = String(rawUrl || '').trim();
  if (!value) return null;

  const url = new URL(value);
  if (url.protocol !== 'https:') {
    throw new Error('LARK_FEEDBACK_WEBHOOK_URL must use https');
  }
  if (!LARK_HOSTS.has(url.hostname)) {
    throw new Error('LARK_FEEDBACK_WEBHOOK_URL must target open.larksuite.com or open.feishu.cn');
  }
  if (!url.pathname.startsWith('/open-apis/bot/v2/hook/')) {
    throw new Error('LARK_FEEDBACK_WEBHOOK_URL must be a Lark custom bot webhook');
  }
  return url.toString();
}

function getOrigin(value) {
  try {
    if (!value) return '';
    return new URL(value).origin;
  } catch (_err) {
    return '';
  }
}

function buildFeedbackInboxUrl(event) {
  // Auto-detected alerts come from the unauthenticated /api/telemetry/errors
  // endpoint, where Origin/Referer are attacker-controlled. Pin the inbox
  // link to the trusted env value so Lark messages cannot be weaponized as
  // phishing redirects. Manual (authenticated) alerts keep the looser
  // priority so staff on staging see staging links.
  if (event.source === 'auto') {
    const envBase =
      getOrigin(process.env.TGROUP_PUBLIC_URL) ||
      getOrigin(process.env.APP_PUBLIC_URL);
    return envBase ? `${envBase}/feedback` : '/feedback';
  }

  const base =
    getOrigin(event.appBaseUrl) ||
    getOrigin(event.pageUrl) ||
    getOrigin(process.env.TGROUP_PUBLIC_URL) ||
    getOrigin(process.env.APP_PUBLIC_URL);

  if (!base) return '/feedback';
  return `${base}/feedback`;
}

function buildSignature(secret, timestamp) {
  return crypto
    .createHmac('sha256', `${timestamp}\n${secret}`)
    .update('')
    .digest('base64');
}

function buildPayload(text, secret = process.env.LARK_FEEDBACK_WEBHOOK_SECRET) {
  const payload = {
    msg_type: 'text',
    content: { text },
  };

  const trimmedSecret = String(secret || '').trim();
  if (trimmedSecret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    payload.timestamp = timestamp;
    payload.sign = buildSignature(trimmedSecret, timestamp);
  }

  return payload;
}

function buildManualFeedbackText(event) {
  return [
    '[TGroup Feedback] New employee feedback',
    `Thread: ${sanitizeSingleLine(event.threadId)}`,
    `Reporter: ${sanitizeSingleLine(event.employeeName || event.employeeId)}`,
    `Page: ${sanitizeSingleLine(event.pagePath || event.pageUrl)}`,
    `Screen: ${sanitizeSingleLine(event.screenSize, 'Unknown')}`,
    `Files: ${Number(event.attachmentCount || 0)}`,
    `Created: ${sanitizeSingleLine(event.createdAt)}`,
    '',
    'Preview:',
    previewText(event.content),
    '',
    `Open feedback inbox: ${buildFeedbackInboxUrl(event)}`,
  ].join('\n');
}

function buildAutoFeedbackText(event) {
  return [
    '[TGroup Feedback] Auto-detected website error',
    `Thread: ${sanitizeSingleLine(event.threadId)}`,
    `Error event: ${sanitizeSingleLine(event.errorEventId)}`,
    `Type: ${sanitizeSingleLine(event.errorType)}`,
    `Route: ${sanitizeSingleLine(event.pagePath || event.route)}`,
    event.apiEndpoint ? `API: ${sanitizeSingleLine(`${event.apiMethod || 'GET'} ${event.apiEndpoint}`)}` : '',
    `Created: ${sanitizeSingleLine(event.createdAt)}`,
    '',
    'Message:',
    previewText(event.errorMessage || event.content),
    '',
    `Open feedback inbox: ${buildFeedbackInboxUrl(event)}`,
  ].filter(Boolean).join('\n');
}

function buildFeedbackText(event) {
  if (event.source === 'auto') return buildAutoFeedbackText(event);
  return buildManualFeedbackText(event);
}

async function notifyFeedbackThreadCreated(event, options = {}) {
  let webhookUrl;
  try {
    webhookUrl = getWebhookUrl(options.webhookUrl);
  } catch (err) {
    console.error('[Lark] Feedback webhook config invalid:', err.message);
    return { ok: false, skipped: true, reason: 'invalid_config' };
  }

  if (!webhookUrl) {
    return { ok: true, skipped: true, reason: 'not_configured' };
  }

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    console.error('[Lark] Feedback webhook failed: fetch is unavailable');
    return { ok: false, skipped: true, reason: 'fetch_unavailable' };
  }

  try {
    const text = buildFeedbackText(event);
    const response = await fetchImpl(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(buildPayload(text, options.secret)),
    });

    if (!response.ok) {
      const body = typeof response.text === 'function' ? await response.text() : '';
      console.error('[Lark] Feedback webhook returned non-2xx:', response.status, body.slice(0, 300));
      return { ok: false, status: response.status };
    }

    return { ok: true, skipped: false };
  } catch (err) {
    console.error('[Lark] Feedback webhook send failed:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildFeedbackText,
  buildPayload,
  buildSignature,
  getWebhookUrl,
  notifyFeedbackThreadCreated,
};

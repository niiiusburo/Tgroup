'use strict';

const {
  buildPayload,
  getWebhookUrl,
} = require('./larkNotifier');

function sanitize(value, fallback = 'unknown') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  return text.length > 200 ? `${text.slice(0, 199)}…` : text;
}

function buildUnexpectedSourceChangeText(event) {
  const reasons = Array.isArray(event.unexpected_reasons)
    ? event.unexpected_reasons.join(',')
    : String(event.unexpected_reasons || '');
  return [
    '[TGroup Source Audit] Unexpected paid/closed source change',
    `Audit: ${sanitize(event.id)}`,
    `Entity: ${sanitize(event.entity_type)} ${sanitize(event.entity_id)}`,
    `Old → New: ${sanitize(event.old_sourceid, 'null')} → ${sanitize(event.new_sourceid, 'null')}`,
    `Channel: ${sanitize(event.change_channel)}`,
    `Reasons: ${sanitize(reasons, 'none')}`,
    `Actor: ${sanitize(event.actor_employee_id, 'system')}`,
    `Request: ${sanitize(event.request_id)}`,
    `Tx: ${sanitize(event.transaction_id)}`,
    event.correction_manifest_ref
      ? `Manifest: ${sanitize(event.correction_manifest_ref)}`
      : null,
    `At: ${sanitize(event.created_at)}`,
  ].filter(Boolean).join('\n');
}

/**
 * Non-blocking Lark alert for unexpected source mutations on paid/closed orders.
 * Uses LARK_FEEDBACK_WEBHOOK_URL (same bot) or optional LARK_SOURCE_AUDIT_WEBHOOK_URL.
 */
async function notifyUnexpectedSourceChange(event, options = {}) {
  const rawUrl =
    options.webhookUrl
    || process.env.LARK_SOURCE_AUDIT_WEBHOOK_URL
    || process.env.LARK_FEEDBACK_WEBHOOK_URL;

  let webhookUrl;
  try {
    webhookUrl = getWebhookUrl(rawUrl);
  } catch (err) {
    console.error('[Lark] Source-audit webhook config invalid:', err.message);
    return { ok: false, skipped: true, reason: 'invalid_config' };
  }

  if (!webhookUrl) {
    console.warn(
      '[SourceAudit] unexpected change (no webhook configured)',
      event?.id,
      event?.entity_id,
      event?.unexpected_reasons,
    );
    return { ok: true, skipped: true, reason: 'not_configured' };
  }

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    console.error('[Lark] Source-audit webhook failed: fetch is unavailable');
    return { ok: false, skipped: true, reason: 'fetch_unavailable' };
  }

  try {
    const text = buildUnexpectedSourceChangeText(event);
    const secret =
      options.secret
      || process.env.LARK_SOURCE_AUDIT_WEBHOOK_SECRET
      || process.env.LARK_FEEDBACK_WEBHOOK_SECRET;
    const response = await fetchImpl(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(buildPayload(text, secret)),
    });

    if (!response.ok) {
      const body = typeof response.text === 'function' ? await response.text() : '';
      console.error(
        '[Lark] Source-audit webhook returned non-2xx:',
        response.status,
        body.slice(0, 300),
      );
      return { ok: false, status: response.status };
    }

    return { ok: true, skipped: false };
  } catch (err) {
    console.error('[Lark] Source-audit webhook send failed:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildUnexpectedSourceChangeText,
  notifyUnexpectedSourceChange,
};

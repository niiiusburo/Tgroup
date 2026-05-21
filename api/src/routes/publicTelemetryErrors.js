'use strict';

const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { query } = require('../db');
const { notifyFeedbackThreadCreated } = require('../services/larkNotifier');

const router = express.Router();

const telemetryErrorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 300 : 60,
  message: { error: 'Too many error reports, please try again later.' },
});

function queueFeedbackCreatedAlert(payload) {
  notifyFeedbackThreadCreated(payload).catch((err) => {
    console.error('[Lark] Feedback alert queue failed:', err.message);
  });
}

router.post('/', telemetryErrorLimiter, async (req, res) => {
  try {
    const { error_type = 'Unknown', message = 'No message', stack = '', component_stack = '',
            route = '', source_file = '', source_line = null,
            api_endpoint = '', api_method = '', api_status = null, api_body = null,
            user_agent = '', user_id = null, location_id = null, metadata = {} } = req.body;

    const normMsg = (message || '')
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
      .replace(/\d{4}-\d{2}-\d{2}/g, '<DATE>')
      .replace(/\d+/g, '<N>')
      .slice(0, 200);
    const topFrame = (stack || '')
      .split('\n')
      .slice(1)
      .find(l => !l.includes('node_modules') && !l.includes('chunk-'))
      ?.trim()
      ?.slice(0, 200) || '';
    const fingerprint = crypto.createHash('sha256').update(`${error_type}|${normMsg}|${topFrame}`).digest('hex').slice(0, 64);

    const existing = await query('SELECT id, status FROM dbo.error_events WHERE fingerprint = $1', [fingerprint]);
    if (existing.length > 0) {
      const row = existing[0];
      const isResolved = ['fixed', 'deployed', 'won_t_fix'].includes(row.status);
      await query(
        `UPDATE dbo.error_events SET last_seen_at = NOW(), occurrence_count = occurrence_count + 1,
         ${isResolved ? "status = 'new'," : ''}
         stack = COALESCE(NULLIF($1, ''), stack),
         component_stack = COALESCE(NULLIF($2, ''), component_stack),
         route = COALESCE(NULLIF($3, ''), route),
         source_file = COALESCE(NULLIF($4, ''), source_file),
         source_line = COALESCE($5, source_line)
         WHERE fingerprint = $6`,
        [stack || '', component_stack || '', route || '', source_file || '', source_line, fingerprint]
      );
      return res.json({ ok: true, fingerprint, is_duplicate: true });
    }

    const result = await query(
      `INSERT INTO dbo.error_events (fingerprint, error_type, message, stack, component_stack, route, source_file, source_line, api_endpoint, api_method, api_status, api_body, user_agent, ip_address, user_id, location_id, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
      [fingerprint, error_type, message, stack || '', component_stack || '', route || '',
       source_file || '', source_line, api_endpoint || '', api_method || '', api_status,
       api_body ? JSON.stringify(api_body) : null,
       user_agent || '', req.ip || '', user_id || null, location_id || null, JSON.stringify(metadata || {})]
    );
    console.log(`[Telemetry] New error: ${error_type} - ${message.slice(0, 80)} (${fingerprint.slice(0, 12)})`);

    const errorEventId = result[0].id;
    try {
      const fbResult = await query(
        `INSERT INTO feedback_threads (source, error_event_id, page_path, status, created_at, updated_at)
         VALUES ('auto', $1, $2, 'pending', NOW(), NOW()) RETURNING id`,
        [errorEventId, route || '/']
      );
      const fbThreadId = fbResult[0].id;
      const fbContent = [
        `Auto-detected ${error_type} Error`,
        `Message: ${message}`,
        stack ? `Stack:\n${stack.slice(0, 500)}` : '',
        source_file ? `Source: ${source_file}${source_line ? `:${source_line}` : ''}` : '',
        api_endpoint ? `API: ${api_method || 'GET'} ${api_endpoint}` : '',
        'Occurrences: 1',
      ].filter(Boolean).join('\n');
      await query(
        `INSERT INTO feedback_messages (thread_id, content, created_at)
         VALUES ($1, $2, NOW())`,
        [fbThreadId, fbContent]
      );
      // Endpoint is unauthenticated, so Origin/Referer are attacker-controlled.
      // larkNotifier.buildFeedbackInboxUrl ignores client URLs for source:'auto'
      // and pins the inbox link to process.env.TGROUP_PUBLIC_URL — do not pass
      // headers here.
      queueFeedbackCreatedAlert({
        source: 'auto',
        threadId: fbThreadId,
        errorEventId,
        pagePath: route || '/',
        route: route || '/',
        content: fbContent,
        errorType: error_type,
        errorMessage: message,
        apiEndpoint: api_endpoint,
        apiMethod: api_method,
        createdAt: new Date().toISOString(),
      });
    } catch (fbErr) {
      console.error('[Telemetry] Feedback thread creation failed:', fbErr.message);
    }

    return res.json({ ok: true, id: errorEventId, fingerprint, is_duplicate: false });
  } catch (err) {
    console.error('[Telemetry] Error insert failed:', err.message);
    return res.json({ ok: true });
  }
});

module.exports = router;

'use strict';

/**
 * @crossref:domain[feedback-cms]
 * @crossref:used-in[user sub-router mounted via api/src/routes/feedback.js at /api/Feedback (/, /my*, /unread-count); frontend client website/src/lib/api/feedback.ts]
 * @crossref:uses[api/src/routes/feedback/admin.js (isAdmin), api/src/routes/feedback/attachments.js (upload + attachment helpers), api/src/db.js (query/pool — feedback_threads/messages), api/src/lib/dateUtils.js (getVietnamNow), product-map/domains/feedback-cms.yaml]
 */
const express = require('express');
const { query, pool } = require('../../db');
const { requireAuth } = require('../../middleware/auth');
const { getVietnamNow } = require('../../lib/dateUtils');
const { isAdmin } = require('./admin');
const {
  upload,
  insertAttachments,
  enrichMessageWithAttachments,
  enrichMessagesWithAttachments,
  removeUploadedFiles,
} = require('./attachments');

const router = express.Router();

/**
 * GET /api/Feedback/unread-count
 * Polled by the header chat icon to show a notification badge.
 *
 * - Admin role: count of pending USER-submitted threads (the queue of
 *   feedback they still owe a response on; auto-detected errors are
 *   excluded so the badge isn't permanently lit by telemetry noise).
 * - Non-admin role: count of THEIR threads where the latest message
 *   came from someone else (i.e., an admin replied and they haven't
 *   acknowledged by sending another message).
 */
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const userIsAdmin = await isAdmin(employeeId, req.user?.authLob || 'dental');

    if (userIsAdmin) {
      const rows = await query(
        `SELECT COUNT(*)::int AS n
         FROM feedback_threads
         WHERE source != 'auto'
           AND status = 'pending'`,
        []
      );
      return res.json({ count: rows[0].n, role: 'admin' });
    }

    const rows = await query(
      `WITH last_msg AS (
         SELECT DISTINCT ON (thread_id) thread_id, author_id
         FROM feedback_messages
         ORDER BY thread_id, created_at DESC
       )
       SELECT COUNT(*)::int AS n
       FROM feedback_threads t
       JOIN last_msg lm ON lm.thread_id = t.id
       WHERE t.employee_id = $1
         AND lm.author_id IS NOT NULL
         AND lm.author_id != $1`,
      [employeeId]
    );
    return res.json({ count: rows[0].n, role: 'staff' });
  } catch (err) {
    console.error('Error fetching feedback unread count:', err);
    return res.status(500).json({ error: 'Internal server error', count: 0 });
  }
});

/**
 * POST /api/Feedback
 * Create a new feedback thread with the first message.
 * Body: multipart/form-data { content, pagePath?, screenSize?, files? }
 *   or JSON { content, pagePath?, screenSize? }
 */
router.post('/', requireAuth, upload.array('files', 5), async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    const { content } = req.body;
    const bodyContent = typeof content === 'string' ? content.trim() : '';
    const hasFiles = req.files && req.files.length > 0;
    if (!bodyContent && !hasFiles) {
      return res.status(400).json({ error: 'Content or file is required' });
    }

    const employeeId = req.user.employeeId;
    const pageUrl = req.headers.referer || req.headers.origin || null;
    const pagePath = req.body.pagePath || null;
    const screenSize = req.body.screenSize || null;
    const userAgent = req.headers['user-agent'] || null;
    const now = getVietnamNow();

    await client.query('BEGIN');
    transactionStarted = true;

    const threadResult = await client.query(
      `INSERT INTO feedback_threads (employee_id, page_url, page_path, screen_size, user_agent, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $6)
       RETURNING *`,
      [employeeId, pageUrl, pagePath, screenSize, userAgent, now]
    );

    const thread = threadResult.rows[0];

    const msgResult = await client.query(
      `INSERT INTO feedback_messages (thread_id, author_id, content, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [thread.id, employeeId, bodyContent, now]
    );

    await insertAttachments(client, msgResult.rows[0].id, req.files);

    await client.query('COMMIT');
    transactionStarted = false;

    return res.status(201).json(thread);
  } catch (err) {
    if (transactionStarted) {
      await client.query('ROLLBACK');
    }
    console.error('Error creating feedback:', err);
    // Clean up uploaded files on error
    removeUploadedFiles(req.files);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/Feedback/my
 * Returns all threads for the current employee.
 */
router.get('/my', requireAuth, async (req, res) => {
  try {
    const employeeId = req.user.employeeId;

    const threads = await query(
      `SELECT
        t.id,
        t.page_url AS "pageUrl",
        t.page_path AS "pagePath",
        t.status,
        t.created_at AS "createdAt",
        t.updated_at AS "updatedAt",
        (SELECT content FROM feedback_messages WHERE thread_id = t.id ORDER BY created_at ASC LIMIT 1) AS "firstMessage",
        (SELECT content FROM feedback_messages WHERE thread_id = t.id AND author_id != $1 ORDER BY created_at DESC LIMIT 1) AS "latestReply"
       FROM feedback_threads t
       WHERE t.employee_id = $1
       ORDER BY t.updated_at DESC`,
      [employeeId]
    );

    return res.json({ items: threads });
  } catch (err) {
    console.error('Error fetching my feedback:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/Feedback/my/:threadId
 * Returns a single thread with all messages for the current employee.
 */
router.get('/my/:threadId', requireAuth, async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const { threadId } = req.params;

    const threadRows = await query(
      `SELECT
        t.id,
        t.page_url AS "pageUrl",
        t.page_path AS "pagePath",
        t.screen_size AS "screenSize",
        t.user_agent AS "userAgent",
        t.status,
        t.created_at AS "createdAt",
        t.updated_at AS "updatedAt"
       FROM feedback_threads t
       WHERE t.id = $1 AND t.employee_id = $2`,
      [threadId, employeeId]
    );

    if (!threadRows || threadRows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const messages = await query(
      `SELECT
        m.id,
        m.author_id AS "authorId",
        p.name AS "authorName",
        m.content,
        m.created_at AS "createdAt"
       FROM feedback_messages m
       LEFT JOIN partners p ON p.id = m.author_id
       WHERE m.thread_id = $1
       ORDER BY m.created_at ASC`,
      [threadId]
    );

    const messagesWithAttachments = await enrichMessagesWithAttachments(messages);

    return res.json({ thread: threadRows[0], messages: messagesWithAttachments });
  } catch (err) {
    console.error('Error fetching feedback thread:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/Feedback/my/:threadId/reply
 * Employee reply inside their own thread.
 */
router.post('/my/:threadId/reply', requireAuth, upload.array('files', 5), async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    const employeeId = req.user.employeeId;
    const { threadId } = req.params;
    const { content } = req.body;
    const bodyContent = typeof content === 'string' ? content.trim() : '';
    const hasFiles = req.files && req.files.length > 0;

    if (!bodyContent && !hasFiles) {
      return res.status(400).json({ error: 'Content or file is required' });
    }

    await client.query('BEGIN');
    transactionStarted = true;

    const threadRows = await client.query(
      'SELECT id FROM feedback_threads WHERE id = $1 AND employee_id = $2 FOR UPDATE',
      [threadId, employeeId]
    );

    if (!threadRows.rows || threadRows.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      removeUploadedFiles(req.files);
      return res.status(404).json({ error: 'Thread not found' });
    }

    const now = getVietnamNow();

    await client.query(
      `UPDATE feedback_threads SET updated_at = $1 WHERE id = $2`,
      [now, threadId]
    );

    const msgResult = await client.query(
      `INSERT INTO feedback_messages (thread_id, author_id, content, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, thread_id AS "threadId", author_id AS "authorId", content, created_at AS "createdAt"`,
      [threadId, employeeId, bodyContent, now]
    );

    await insertAttachments(client, msgResult.rows[0].id, req.files);

    const enrichedMsg = await enrichMessageWithAttachments(client, msgResult.rows[0]);

    await client.query('COMMIT');
    transactionStarted = false;
    return res.status(201).json(enrichedMsg);
  } catch (err) {
    if (transactionStarted) {
      await client.query('ROLLBACK');
    }
    console.error('Error replying to feedback:', err);
    removeUploadedFiles(req.files);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;

'use strict';

const express = require('express');
const { query, pool } = require('../../db');
const { requireAuth } = require('../../middleware/auth');
const { getVietnamNow } = require('../../lib/dateUtils');
const {
  upload,
  insertAttachments,
  enrichMessageWithAttachments,
  enrichMessagesWithAttachments,
  removeUploadedFiles,
} = require('./attachments');

const router = express.Router();

/**
 * POST /api/Feedback
 * Create a new feedback thread with the first message.
 * Body: multipart/form-data { content, pagePath?, screenSize?, files? }
 *   or JSON { content, pagePath?, screenSize? }
 */
router.post('/', requireAuth, upload.array('files', 5), async (req, res) => {
  const client = await pool.connect();
  try {
    const { content } = req.body;
    const hasFiles = req.files && req.files.length > 0;
    if ((!content || !content.trim()) && !hasFiles) {
      return res.status(400).json({ error: 'Content or file is required' });
    }

    const employeeId = req.user.employeeId;
    const pageUrl = req.headers.referer || req.headers.origin || null;
    const pagePath = req.body.pagePath || null;
    const screenSize = req.body.screenSize || null;
    const userAgent = req.headers['user-agent'] || null;
    const now = getVietnamNow();

    await client.query('BEGIN');

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
      [thread.id, employeeId, content.trim(), now]
    );

    await insertAttachments(client, msgResult.rows[0].id, req.files);

    await client.query('COMMIT');

    return res.status(201).json(thread);
  } catch (err) {
    await client.query('ROLLBACK');
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
  try {
    const employeeId = req.user.employeeId;
    const { threadId } = req.params;
    const { content } = req.body;
    const hasFiles = req.files && req.files.length > 0;

    if ((!content || !content.trim()) && !hasFiles) {
      return res.status(400).json({ error: 'Content or file is required' });
    }

    const threadRows = await client.query(
      'SELECT id FROM feedback_threads WHERE id = $1 AND employee_id = $2 FOR UPDATE',
      [threadId, employeeId]
    );

    if (!threadRows.rows || threadRows.rows.length === 0) {
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
      [threadId, employeeId, content.trim(), now]
    );

    await insertAttachments(client, msgResult.rows[0].id, req.files);

    const enrichedMsg = await enrichMessageWithAttachments(client, msgResult.rows[0]);

    await client.query('COMMIT');
    return res.status(201).json(enrichedMsg);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error replying to feedback:', err);
    removeUploadedFiles(req.files);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;

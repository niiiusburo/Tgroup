'use strict';

const express = require('express');
const { query, pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const VALID_STATUSES = new Set(['pending', 'in_progress', 'resolved', 'ignored']);

/**
 * Admin check helper.
 * Admin = belongs to 'System Administrator' group OR has both permissions.view + permissions.edit
 */
async function isAdmin(employeeId) {
  const epRows = await query(
    `SELECT ep.group_id, pg.name AS group_name
     FROM employee_permissions ep
     JOIN permission_groups pg ON pg.id = ep.group_id
     WHERE ep.employee_id = $1`,
    [employeeId]
  );

  if (!epRows || epRows.length === 0) return false;

  const groupName = epRows[0].group_name;
  if (groupName === 'System Administrator') return true;

  const [basePermRows, overrideRows] = await Promise.all([
    query(
      `SELECT permission FROM group_permissions WHERE group_id = $1`,
      [epRows[0].group_id]
    ),
    query(
      `SELECT permission, override_type FROM permission_overrides WHERE employee_id = $1`,
      [employeeId]
    ),
  ]);

  const basePerms = basePermRows.map(r => r.permission);
  const granted = overrideRows.filter(r => r.override_type === 'grant').map(r => r.permission);
  const revoked = overrideRows.filter(r => r.override_type === 'revoke').map(r => r.permission);

  const effectiveSet = new Set([...basePerms, ...granted]);
  for (const p of revoked) effectiveSet.delete(p);

  return effectiveSet.has('permissions.view') && effectiveSet.has('permissions.edit');
}

function requireAdmin(req, res, next) {
  isAdmin(req.user.employeeId)
    .then((admin) => {
      if (admin) return next();
      return res.status(403).json({ error: 'Admin access required' });
    })
    .catch((err) => {
      console.error('requireAdmin error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    });
}

/**
 * POST /api/Feedback
 * Create a new feedback thread with the first message.
 * Body: { content }
 */
router.post('/', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const employeeId = req.user.employeeId;
    const pageUrl = req.headers.referer || req.headers.origin || null;
    const pagePath = req.body.pagePath || null;
    const screenSize = req.body.screenSize || null;
    const userAgent = req.headers['user-agent'] || null;
    const now = new Date().toISOString();

    await client.query('BEGIN');

    const threadResult = await client.query(
      `INSERT INTO feedback_threads (employee_id, page_url, page_path, screen_size, user_agent, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $6)
       RETURNING *`,
      [employeeId, pageUrl, pagePath, screenSize, userAgent, now]
    );

    const thread = threadResult.rows[0];

    await client.query(
      `INSERT INTO feedback_messages (thread_id, author_id, content, created_at)
       VALUES ($1, $2, $3, $4)`,
      [thread.id, employeeId, content.trim(), now]
    );

    await client.query('COMMIT');

    return res.status(201).json(thread);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating feedback:', err);
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

    return res.json({ thread: threadRows[0], messages });
  } catch (err) {
    console.error('Error fetching feedback thread:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/Feedback/my/:threadId/reply
 * Employee reply inside their own thread.
 */
router.post('/my/:threadId/reply', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const employeeId = req.user.employeeId;
    const { threadId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const threadRows = await client.query(
      'SELECT id FROM feedback_threads WHERE id = $1 AND employee_id = $2 FOR UPDATE',
      [threadId, employeeId]
    );

    if (!threadRows.rows || threadRows.rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const now = new Date().toISOString();

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

    await client.query('COMMIT');
    return res.status(201).json(msgResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error replying to feedback:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/Feedback/all
 * Admin-only: returns all threads.
 */
router.get('/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const threads = await query(
      `SELECT
        t.id,
        t.employee_id AS "employeeId",
        p.name AS "employeeName",
        t.page_url AS "pageUrl",
        t.page_path AS "pagePath",
        t.status,
        t.created_at AS "createdAt",
        t.updated_at AS "updatedAt",
        (SELECT content FROM feedback_messages WHERE thread_id = t.id ORDER BY created_at ASC LIMIT 1) AS "firstMessage",
        (SELECT content FROM feedback_messages WHERE thread_id = t.id AND author_id != t.employee_id ORDER BY created_at DESC LIMIT 1) AS "latestReply"
       FROM feedback_threads t
       JOIN partners p ON p.id = t.employee_id
       ORDER BY t.updated_at DESC`
    );

    return res.json({ items: threads });
  } catch (err) {
    console.error('Error fetching all feedback:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/Feedback/all/:threadId
 * Admin-only: returns full thread with all messages.
 */
router.get('/all/:threadId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { threadId } = req.params;

    const threadRows = await query(
      `SELECT
        t.id,
        t.employee_id AS "employeeId",
        p.name AS "employeeName",
        t.page_url AS "pageUrl",
        t.page_path AS "pagePath",
        t.screen_size AS "screenSize",
        t.user_agent AS "userAgent",
        t.status,
        t.created_at AS "createdAt",
        t.updated_at AS "updatedAt"
       FROM feedback_threads t
       JOIN partners p ON p.id = t.employee_id
       WHERE t.id = $1`,
      [threadId]
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

    return res.json({ thread: threadRows[0], messages });
  } catch (err) {
    console.error('Error fetching admin feedback thread:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/Feedback/all/:threadId/reply
 * Admin-only: append a message to the thread.
 */
router.post('/all/:threadId/reply', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const adminId = req.user.employeeId;
    const { threadId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const threadRows = await client.query(
      'SELECT id FROM feedback_threads WHERE id = $1 FOR UPDATE',
      [threadId]
    );

    if (!threadRows.rows || threadRows.rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const now = new Date().toISOString();

    await client.query(
      `UPDATE feedback_threads SET updated_at = $1 WHERE id = $2`,
      [now, threadId]
    );

    const msgResult = await client.query(
      `INSERT INTO feedback_messages (thread_id, author_id, content, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, thread_id AS "threadId", author_id AS "authorId", content, created_at AS "createdAt"`,
      [threadId, adminId, content.trim(), now]
    );

    await client.query('COMMIT');
    return res.status(201).json(msgResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error admin-replying to feedback:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/Feedback/all/:threadId/status
 * Admin-only: update thread status.
 */
router.patch('/all/:threadId/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { threadId } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await query(
      `UPDATE feedback_threads SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, threadId]
    );

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    return res.json(result[0]);
  } catch (err) {
    console.error('Error updating feedback status:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

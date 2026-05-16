'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { query, pool } = require('../../db');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('./admin');
const { getVietnamNow } = require('../../lib/dateUtils');
const {
  UPLOAD_DIR,
  upload,
  insertAttachments,
  enrichMessageWithAttachments,
  enrichMessagesWithAttachments,
  removeUploadedFiles,
} = require('./attachments');

const router = express.Router();
const VALID_STATUSES = new Set(['pending', 'in_progress', 'resolved', 'ignored']);

/**
 * GET /api/Feedback/all
 * Admin-only: returns all threads.
 */
router.get('/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { source } = req.query; // 'manual', 'auto', or empty for all
    let whereClause = '';
    const params = [];

    if (source === 'auto') {
      whereClause = 'WHERE t.source = $1';
      params.push('auto');
    } else if (source === 'manual') {
      whereClause = 'WHERE t.source = $1';
      params.push('manual');
    }

    let threads;
    if (source === 'auto') {
      threads = await query(
        `SELECT
          t.id,
          t.employee_id AS "employeeId",
          COALESCE(p.name, 'System') AS "employeeName",
          t.page_url AS "pageUrl",
          t.page_path AS "pagePath",
          t.status,
          t.source,
          t.error_event_id AS "errorEventId",
          t.created_at AS "createdAt",
          t.updated_at AS "updatedAt",
          (SELECT content FROM feedback_messages WHERE thread_id = t.id ORDER BY created_at ASC LIMIT 1) AS "firstMessage",
          (SELECT content FROM feedback_messages WHERE thread_id = t.id AND author_id != t.employee_id ORDER BY created_at DESC LIMIT 1) AS "latestReply",
          e.error_type AS "errorType",
          e.message AS "errorMessage",
          e.stack AS "errorStack",
          e.source_file AS "errorSourceFile",
          e.source_line AS "errorSourceLine",
          e.route AS "errorRoute",
          e.api_endpoint AS "errorApiEndpoint",
          e.api_method AS "errorApiMethod",
          e.api_status AS "errorApiStatus",
          e.occurrence_count AS "errorOccurrenceCount",
          e.first_seen_at AS "errorFirstSeenAt",
          e.last_seen_at AS "errorLastSeenAt",
          e.status AS "errorEventStatus",
          e.fix_summary AS "errorFixSummary",
          e.fix_commit AS "errorFixCommit"
         FROM feedback_threads t
         LEFT JOIN partners p ON p.id = t.employee_id
         LEFT JOIN dbo.error_events e ON e.id = t.error_event_id
         ${whereClause}
         ORDER BY t.updated_at DESC`,
        params
      );
    } else {
      threads = await query(
        `SELECT
          t.id,
          t.employee_id AS "employeeId",
          COALESCE(p.name, 'System') AS "employeeName",
          t.page_url AS "pageUrl",
          t.page_path AS "pagePath",
          t.status,
          t.source,
          t.error_event_id AS "errorEventId",
          t.created_at AS "createdAt",
          t.updated_at AS "updatedAt",
          (SELECT content FROM feedback_messages WHERE thread_id = t.id ORDER BY created_at ASC LIMIT 1) AS "firstMessage",
          (SELECT content FROM feedback_messages WHERE thread_id = t.id AND author_id != t.employee_id ORDER BY created_at DESC LIMIT 1) AS "latestReply"
         FROM feedback_threads t
         LEFT JOIN partners p ON p.id = t.employee_id
         ${whereClause}
         ORDER BY t.updated_at DESC`,
        params
      );
    }

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
        t.source,
        t.error_event_id AS "errorEventId",
        t.created_at AS "createdAt",
        t.updated_at AS "updatedAt",
        e.error_type AS "errorType",
        e.message AS "errorMessage",
        e.stack AS "errorStack",
        e.component_stack AS "errorComponentStack",
        e.source_file AS "errorSourceFile",
        e.source_line AS "errorSourceLine",
        e.route AS "errorRoute",
        e.api_endpoint AS "errorApiEndpoint",
        e.api_method AS "errorApiMethod",
        e.api_status AS "errorApiStatus",
        e.api_body AS "errorApiBody",
        e.occurrence_count AS "errorOccurrenceCount",
        e.first_seen_at AS "errorFirstSeenAt",
        e.last_seen_at AS "errorLastSeenAt",
        e.status AS "errorEventStatus",
        e.fix_summary AS "errorFixSummary",
        e.fix_commit AS "errorFixCommit"
       FROM feedback_threads t
       LEFT JOIN partners p ON p.id = t.employee_id
       LEFT JOIN dbo.error_events e ON e.id = t.error_event_id
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

    const messagesWithAttachments = await enrichMessagesWithAttachments(messages);

    return res.json({ thread: threadRows[0], messages: messagesWithAttachments });
  } catch (err) {
    console.error('Error fetching admin feedback thread:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/Feedback/all/:threadId/reply
 * Admin-only: append a message to the thread.
 */
router.post('/all/:threadId/reply', requireAuth, requireAdmin, upload.array('files', 5), async (req, res) => {
  const client = await pool.connect();
  try {
    const adminId = req.user.employeeId;
    const { threadId } = req.params;
    const { content } = req.body;
    const hasFiles = req.files && req.files.length > 0;

    if ((!content || !content.trim()) && !hasFiles) {
      return res.status(400).json({ error: 'Content or file is required' });
    }

    const threadRows = await client.query(
      'SELECT id FROM feedback_threads WHERE id = $1 FOR UPDATE',
      [threadId]
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
      [threadId, adminId, content.trim(), now]
    );

    await insertAttachments(client, msgResult.rows[0].id, req.files);

    const enrichedMsg = await enrichMessageWithAttachments(client, msgResult.rows[0]);

    await client.query('COMMIT');
    return res.status(201).json(enrichedMsg);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error admin-replying to feedback:', err);
    removeUploadedFiles(req.files);
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
      `UPDATE feedback_threads SET status = $1, updated_at = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') WHERE id = $2 RETURNING *`,
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

/**
 * DELETE /api/Feedback/all/:threadId
 * Admin-only: permanently delete a thread and all associated data.
 */
router.delete('/all/:threadId', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { threadId } = req.params;

    // Verify thread exists
    const threadResult = await client.query(
      'SELECT id FROM feedback_threads WHERE id = $1',
      [threadId]
    );

    if (!threadResult.rows || threadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    await client.query('BEGIN');

    // Get all messages to find attachments
    const messageResult = await client.query(
      'SELECT id FROM feedback_messages WHERE thread_id = $1',
      [threadId]
    );
    const messageIds = messageResult.rows.map(r => r.id);

    // Get all attachments for file deletion
    if (messageIds.length > 0) {
      const attachmentResult = await client.query(
        'SELECT stored_name FROM feedback_attachments WHERE message_id = ANY($1)',
        [messageIds]
      );

      // Delete physical files (log errors but don't block transaction)
      for (const row of attachmentResult.rows) {
        try {
          const filePath = path.join(UPLOAD_DIR, row.stored_name);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (fileErr) {
          console.error('Failed to delete attachment file:', row.stored_name, fileErr);
        }
      }

      // Delete attachment records
      await client.query(
        'DELETE FROM feedback_attachments WHERE message_id = ANY($1)',
        [messageIds]
      );
    }

    // Delete messages
    await client.query(
      'DELETE FROM feedback_messages WHERE thread_id = $1',
      [threadId]
    );

    // Delete thread
    await client.query(
      'DELETE FROM feedback_threads WHERE id = $1',
      [threadId]
    );

    await client.query('COMMIT');
    return res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting feedback thread:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;

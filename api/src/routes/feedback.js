'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const sharp = require('sharp');
const { query, pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getVietnamNow } = require('../lib/dateUtils');

const router = express.Router();

const VALID_STATUSES = new Set(['pending', 'in_progress', 'resolved', 'ignored']);

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'feedback');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

/**
 * Admin check helper.
 * Admin = belongs to 'System Administrator' group OR has permissions.view
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

  return effectiveSet.has('permissions.view');
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

async function compressImage(file) {
  if (file.mimetype === 'image/gif') return; // preserve animated GIFs
  try {
    const newFilename = `${uuidv4()}.jpg`;
    const newPath = path.join(UPLOAD_DIR, newFilename);

    await sharp(file.path)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toFile(newPath);

    fs.unlinkSync(file.path);
    file.filename = newFilename;
    file.path = newPath;
    file.mimetype = 'image/jpeg';
    file.size = fs.statSync(newPath).size;
  } catch (err) {
    console.error('Image compression failed, keeping original:', err);
  }
}

async function insertAttachments(client, messageId, files) {
  if (!files || files.length === 0) return;
  for (const file of files) {
    await compressImage(file);
    const url = `/uploads/feedback/${file.filename}`;
    await client.query(
      `INSERT INTO feedback_attachments (message_id, original_name, stored_name, mime_type, size_bytes, url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'))`,
      [messageId, file.originalname, file.filename, file.mimetype, file.size, url]
    );
  }
}

async function enrichMessageWithAttachments(client, message) {
  const rows = await client.query(
    `SELECT id, message_id, original_name, mime_type, size_bytes, url, created_at
     FROM feedback_attachments
     WHERE message_id = $1
     ORDER BY created_at ASC`,
    [message.id]
  );
  return {
    ...message,
    attachments: rows.rows.map((row) => ({
      id: row.id,
      messageId: row.message_id,
      originalName: row.original_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      url: row.url,
      createdAt: row.created_at,
    })),
  };
}

async function fetchAttachmentsForMessages(messageIds) {
  if (!messageIds || messageIds.length === 0) return {};
  const rows = await query(
    `SELECT id, message_id, original_name, mime_type, size_bytes, url, created_at
     FROM feedback_attachments
     WHERE message_id = ANY($1)
     ORDER BY created_at ASC`,
    [messageIds]
  );
  const map = {};
  for (const row of rows) {
    const msgId = row.message_id;
    if (!map[msgId]) map[msgId] = [];
    map[msgId].push({
      id: row.id,
      messageId: row.message_id,
      originalName: row.original_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      url: row.url,
      createdAt: row.created_at,
    });
  }
  return map;
}

async function enrichMessagesWithAttachments(messages) {
  const messageIds = messages.map(m => m.id);
  const attachmentMap = await fetchAttachmentsForMessages(messageIds);
  return messages.map((m) => ({
    ...m,
    attachments: attachmentMap[m.id] || [],
  }));
}

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
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try { fs.unlinkSync(file.path); } catch (_) {}
      }
    }
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
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try { fs.unlinkSync(file.path); } catch (_) {}
      }
    }
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
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try { fs.unlinkSync(file.path); } catch (_) {}
      }
    }
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

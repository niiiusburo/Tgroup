'use strict';

const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const sharp = require('sharp');
const { query } = require('../../db');

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

function mapAttachmentRows(rows) {
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

async function fetchAttachmentsForMessages(messageIds) {
  if (!messageIds || messageIds.length === 0) return {};
  const rows = await query(
    `SELECT id, message_id, original_name, mime_type, size_bytes, url, created_at
     FROM feedback_attachments
     WHERE message_id = ANY($1)
     ORDER BY created_at ASC`,
    [messageIds]
  );
  return mapAttachmentRows(rows);
}

async function enrichMessagesWithAttachments(messages) {
  const messageIds = messages.map(m => m.id);
  const attachmentMap = await fetchAttachmentsForMessages(messageIds);
  return messages.map((m) => ({
    ...m,
    attachments: attachmentMap[m.id] || [],
  }));
}

function removeUploadedFiles(files) {
  if (!files || files.length === 0) return;
  for (const file of files) {
    try { fs.unlinkSync(file.path); } catch (_) {}
  }
}

module.exports = {
  UPLOAD_DIR,
  upload,
  insertAttachments,
  enrichMessageWithAttachments,
  enrichMessagesWithAttachments,
  mapAttachmentRows,
  removeUploadedFiles,
};

/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[api/src/routes/patient/chat.js, staff admin routes]
 * @crossref:uses[dbo.chat_sessions, dbo.chat_messages, dbo.support_kb_chunks, dbo.support_tickets]
 *
 * Learning loop: turn resolved human-handled chat sessions into retrievable
 * knowledge base chunks so the AI can answer similar questions next time.
 */

'use strict';
const { getQuery } = require('../../db');
const { storeChunk } = require('./ragService');

const MAX_CHUNK_LENGTH = 1000;

function makeDb() {
  return (sql, params) => getQuery('dental')(sql, params);
}

function chunkText(text, maxLength = MAX_CHUNK_LENGTH) {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength && current.length > 0) {
      chunks.push(current.trim());
      current = '';
    }
    current += sentence + ' ';
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Build a sanitized transcript from a resolved chat session and store
 * learnable chunks in the knowledge base. Chunks are inserted with
 * approved = false so staff can review before they become retrievable.
 */
async function learnFromResolvedSession(sessionId) {
  const db = makeDb();

  const sessionRows = await db(
    `SELECT id, partner_id, status, ticket_id
     FROM dbo.chat_sessions
     WHERE id = $1`,
    [sessionId]
  );

  if (sessionRows.length === 0) {
    const err = new Error('Session not found');
    err.status = 404;
    err.code = 'SESSION_NOT_FOUND';
    throw err;
  }

  const session = sessionRows[0];
  if (session.status !== 'closed' && session.status !== 'human') {
    const err = new Error('Session must be escalated or closed before learning');
    err.status = 400;
    err.code = 'SESSION_NOT_RESOLVED';
    throw err;
  }

  const messageRows = await db(
    `SELECT role, content, created_at
     FROM dbo.chat_messages
     WHERE session_id = $1 AND role IN ('patient', 'ai', 'staff')
     ORDER BY created_at ASC`,
    [sessionId]
  );

  if (messageRows.length === 0) {
    return { chunksStored: 0 };
  }

  // Build a plain transcript, redacting obvious PII patterns (phone numbers).
  const transcript = messageRows
    .map((m) => `${m.role === 'patient' ? 'Bệnh nhân' : m.role === 'staff' ? 'Nhân viên' : 'AI'}: ${m.content}`)
    .join('\n\n')
    .replace(/\b0\d{9}\b/g, '[SỐ ĐIỆN THOẠI]');

  const chunks = chunkText(transcript);
  const storedChunkIds = [];

  for (const chunk of chunks) {
    const id = await storeChunk(db, {
      content: chunk,
      source: 'resolved_chat',
      metadata: {
        session_id: sessionId,
        ticket_id: session.ticket_id,
        partner_id: session.partner_id,
        approved: false,
      },
    });
    storedChunkIds.push(id);
  }

  return {
    chunksStored: storedChunkIds.length,
    chunkIds: storedChunkIds,
  };
}

module.exports = {
  learnFromResolvedSession,
  chunkText,
};

/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[api/src/routes/patient/chat.js]
 * @crossref:uses[ragService.js, escalationService.js, aiConfig.js, dbo.chat_sessions, dbo.chat_messages]
 *
 * Orchestrates patient chat: persist messages, retrieve KB context, generate AI replies,
 * and escalate to human staff when needed.
 */

'use strict';
const { getQuery } = require('../../db');
const { generateChatResponse } = require('./aiConfig');
const { retrieveContext, buildSupportSystemPrompt } = require('./ragService');
const { checkEscalation, createEscalationTicket } = require('./escalationService');

const MESSAGE_HISTORY_LIMIT = 10;

function makeDb() {
  return (sql, params) => getQuery('dental')(sql, params);
}

async function verifySessionOwnership(db, sessionId, partnerId) {
  const rows = await db(
    `SELECT id, status FROM dbo.chat_sessions WHERE id = $1 AND partner_id = $2`,
    [sessionId, partnerId]
  );
  if (rows.length === 0) {
    const err = new Error('Session not found');
    err.status = 404;
    err.code = 'SESSION_NOT_FOUND';
    throw err;
  }
  return rows[0];
}

async function listSessions(partnerId) {
  const db = makeDb();
  return db(
    `SELECT id, status, ticket_id, created_at, updated_at
     FROM dbo.chat_sessions
     WHERE partner_id = $1
     ORDER BY updated_at DESC`,
    [partnerId]
  );
}

async function createSession(partnerId) {
  const db = makeDb();
  const result = await db(
    `INSERT INTO dbo.chat_sessions (partner_id, status)
     VALUES ($1, 'ai') RETURNING *`,
    [partnerId]
  );
  return result[0];
}

async function listMessages(sessionId, partnerId) {
  const db = makeDb();
  await verifySessionOwnership(db, sessionId, partnerId);
  return db(
    `SELECT id, role, content, metadata, created_at
     FROM dbo.chat_messages
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId]
  );
}

async function sendMessage({ sessionId, partnerId, content }) {
  const db = makeDb();
  const session = await verifySessionOwnership(db, sessionId, partnerId);

  if (session.status === 'closed') {
    const err = new Error('Session is closed');
    err.status = 400;
    err.code = 'SESSION_CLOSED';
    throw err;
  }

  // Persist patient message
  await db(
    `INSERT INTO dbo.chat_messages (session_id, role, content)
     VALUES ($1, 'patient', $2)`,
    [sessionId, content]
  );

  // Retrieve KB context
  const { chunks, contextText } = await retrieveContext(db, content, 5);
  const systemPrompt = buildSupportSystemPrompt(contextText, 'NK Clinic');

  // Build recent message history
  const historyRows = await db(
    `SELECT role, content FROM dbo.chat_messages
     WHERE session_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [sessionId, MESSAGE_HISTORY_LIMIT]
  );
  const messages = historyRows
    .reverse()
    .filter((r) => r.role === 'patient' || r.role === 'ai')
    .map((r) => ({
      role: r.role === 'patient' ? 'user' : 'assistant',
      content: r.content,
    }));

  // Generate AI reply
  const { content: aiContent } = await generateChatResponse({
    system: systemPrompt,
    messages,
  });

  // Escalation check
  const escalation = checkEscalation(content, aiContent);
  let ticketId = null;

  if (escalation.shouldEscalate) {
    ticketId = await createEscalationTicket({
      db,
      partnerId,
      sessionId,
      reason: escalation.reason,
      summary: `Patient: ${content}\nAI: ${aiContent}`,
    });
    await db(
      `UPDATE dbo.chat_sessions SET status = 'human', ticket_id = $2, updated_at = NOW() WHERE id = $1`,
      [sessionId, ticketId]
    );
  } else {
    await db(
      `UPDATE dbo.chat_sessions SET updated_at = NOW() WHERE id = $1`,
      [sessionId]
    );
  }

  // Persist AI reply
  const aiMessageMeta = {
    chunks: chunks.map((c) => c.id),
    escalation: escalation.shouldEscalate ? escalation : null,
  };
  await db(
    `INSERT INTO dbo.chat_messages (session_id, role, content, metadata)
     VALUES ($1, 'ai', $2, $3)`,
    [sessionId, aiContent, JSON.stringify(aiMessageMeta)]
  );

  return {
    reply: aiContent,
    escalated: escalation.shouldEscalate,
    reason: escalation.reason,
    ticketId,
  };
}

async function escalateToHuman({ sessionId, partnerId, reason = 'patient_requested' }) {
  const db = makeDb();
  await verifySessionOwnership(db, sessionId, partnerId);

  const historyRows = await db(
    `SELECT role, content FROM dbo.chat_messages
     WHERE session_id = $1
     ORDER BY created_at DESC
     LIMIT 6`,
    [sessionId]
  );
  const summary = historyRows
    .reverse()
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const ticketId = await createEscalationTicket({
    db,
    partnerId,
    sessionId,
    reason,
    summary,
  });

  await db(
    `UPDATE dbo.chat_sessions SET status = 'human', ticket_id = $2, updated_at = NOW() WHERE id = $1`,
    [sessionId, ticketId]
  );

  return ticketId;
}

module.exports = {
  listSessions,
  createSession,
  listMessages,
  sendMessage,
  escalateToHuman,
};

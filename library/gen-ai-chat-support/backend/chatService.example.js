/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[api/src/routes/patient/chat.js]
 * @crossref:uses[ai-service.ts, rag-pipeline.ts, escalation-service.ts]
 *
 * Example orchestration service wiring the AI + RAG + escalation pieces together.
 */

'use strict';
const { getQuery } = require('../../db');
const { generateChatResponse } = require('./ai-service');
const { retrieveContext, buildSupportSystemPrompt } = require('./rag-pipeline');
const { checkEscalation, createEscalationTicket } = require('./escalation-service');

const db = (sql, params) => getQuery('dental')(sql, params);

async function listSessions(partnerId) {
  return db(
    `SELECT id, status, ticket_id, created_at, updated_at
     FROM dbo.chat_sessions
     WHERE partner_id = $1
     ORDER BY updated_at DESC`,
    [partnerId]
  );
}

async function createSession(partnerId) {
  const result = await db(
    `INSERT INTO dbo.chat_sessions (partner_id, status)
     VALUES ($1, 'ai') RETURNING *`,
    [partnerId]
  );
  return result[0];
}

async function listMessages(sessionId, partnerId) {
  await verifySessionOwnership(sessionId, partnerId);
  return db(
    `SELECT id, role, content, metadata, created_at
     FROM dbo.chat_messages
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId]
  );
}

async function sendMessage({ sessionId, partnerId, content }) {
  await verifySessionOwnership(sessionId, partnerId);

  // Persist patient message
  await db(
    `INSERT INTO dbo.chat_messages (session_id, role, content)
     VALUES ($1, 'patient', $2)`,
    [sessionId, content]
  );

  // Retrieve context and build prompt
  const { chunks, contextText } = await retrieveContext(db, content, 5);
  const systemPrompt = buildSupportSystemPrompt(contextText, 'NK Clinic');

  // Build recent message history (last 10)
  const historyRows = await db(
    `SELECT role, content FROM dbo.chat_messages
     WHERE session_id = $1
     ORDER BY created_at DESC
     LIMIT 10`,
    [sessionId]
  );
  const messages = historyRows.reverse().map((r) => ({
    role: r.role === 'patient' ? 'user' : 'assistant',
    content: r.content,
  }));

  // Generate AI reply
  const { content: aiContent } = await generateChatResponse({
    system: systemPrompt,
    messages,
  });

  // Escalation check
  const escalation = checkEscalation(content, aiContent, chunks.length);

  if (escalation.shouldEscalate) {
    const ticketId = await createEscalationTicket({
      db,
      partnerId,
      sessionId,
      reason: escalation.reason,
      summary: `Patient: ${content}\nAI: ${aiContent}`,
    });
    await db(
      `UPDATE dbo.chat_sessions SET status = 'human', ticket_id = $2 WHERE id = $1`,
      [sessionId, ticketId]
    );
  }

  // Persist AI reply
  await db(
    `INSERT INTO dbo.chat_messages (session_id, role, content, metadata)
     VALUES ($1, 'ai', $2, $3)`,
    [sessionId, aiContent, JSON.stringify({ chunks: chunks.map((c) => c.id), escalation })]
  );

  return {
    reply: aiContent,
    escalated: escalation.shouldEscalate,
    reason: escalation.reason,
  };
}

async function escalateToHuman({ sessionId, partnerId, reason }) {
  await verifySessionOwnership(sessionId, partnerId);
  const messages = await listMessages(sessionId, partnerId);
  const summary = messages.slice(-6).map((m) => `${m.role}: ${m.content}`).join('\n');
  const ticketId = await createEscalationTicket({
    db,
    partnerId,
    sessionId,
    reason,
    summary,
  });
  await db(
    `UPDATE dbo.chat_sessions SET status = 'human', ticket_id = $2 WHERE id = $1`,
    [sessionId, ticketId]
  );
  return ticketId;
}

async function verifySessionOwnership(sessionId, partnerId) {
  const rows = await db(
    `SELECT id FROM dbo.chat_sessions WHERE id = $1 AND partner_id = $2`,
    [sessionId, partnerId]
  );
  if (rows.length === 0) {
    const err = new Error('Session not found');
    err.status = 404;
    throw err;
  }
}

module.exports = {
  listSessions,
  createSession,
  listMessages,
  sendMessage,
  escalateToHuman,
};

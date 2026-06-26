/**
 * @crossref:domain[patient-portal]
 * @crossref:route[/api/patient/chat]
 * @crossref:used-in[nk-patient-app chat screen]
 * @crossref:uses[api/src/services/ai/chatService.js, api/src/middleware/patientAuth.js]
 *
 * Patient chat endpoints: list/create sessions, messages, and human escalation.
 */

'use strict';
const express = require('express');
const { requirePatientAuth } = require('../../middleware/patientAuth');
const chatService = require('../../services/ai/chatService');
const { learnFromResolvedSession } = require('../../services/ai/learningService');

const router = express.Router();

/**
 * GET /api/patient/chat/sessions
 */
router.get('/sessions', requirePatientAuth, async (req, res) => {
  try {
    const sessions = await chatService.listSessions(req.patient.partnerId);
    return res.json({ success: true, sessions });
  } catch (err) {
    console.error('[patientChat] list sessions error:', err);
    return res.status(err.status || 500).json({
      error: err.message || 'Server error',
      code: err.code || 'SERVER_ERROR',
    });
  }
});

/**
 * POST /api/patient/chat/sessions
 */
router.post('/sessions', requirePatientAuth, async (req, res) => {
  try {
    const session = await chatService.createSession(req.patient.partnerId);
    return res.status(201).json({ success: true, session });
  } catch (err) {
    console.error('[patientChat] create session error:', err);
    return res.status(err.status || 500).json({
      error: err.message || 'Server error',
      code: err.code || 'SERVER_ERROR',
    });
  }
});

/**
 * GET /api/patient/chat/sessions/:id/messages
 */
router.get('/sessions/:id/messages', requirePatientAuth, async (req, res) => {
  try {
    const messages = await chatService.listMessages(req.params.id, req.patient.partnerId);
    return res.json({ success: true, messages });
  } catch (err) {
    console.error('[patientChat] list messages error:', err);
    return res.status(err.status || 500).json({
      error: err.message || 'Server error',
      code: err.code || 'SERVER_ERROR',
    });
  }
});

/**
 * POST /api/patient/chat/sessions/:id/messages
 */
router.post('/sessions/:id/messages', requirePatientAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'content is required', code: 'MISSING_FIELDS' });
    }

    const result = await chatService.sendMessage({
      sessionId: req.params.id,
      partnerId: req.patient.partnerId,
      content: content.trim(),
    });

    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[patientChat] send message error:', err);
    return res.status(err.status || 500).json({
      error: err.message || 'Server error',
      code: err.code || 'SERVER_ERROR',
    });
  }
});

/**
 * POST /api/patient/chat/sessions/:id/escalate
 */
router.post('/sessions/:id/escalate', requirePatientAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const ticketId = await chatService.escalateToHuman({
      sessionId: req.params.id,
      partnerId: req.patient.partnerId,
      reason: reason || 'patient_requested',
    });
    return res.json({ success: true, ticketId });
  } catch (err) {
    console.error('[patientChat] escalate error:', err);
    return res.status(err.status || 500).json({
      error: err.message || 'Server error',
      code: err.code || 'SERVER_ERROR',
    });
  }
});

/**
 * POST /api/patient/chat/sessions/:id/learn
 *
 * Learning-loop entry point (MVP): patient can request their resolved
 * conversation be chunked and added to the knowledge base pending staff
 * approval. In production this should be moved to a staff-only admin route.
 */
router.post('/sessions/:id/learn', requirePatientAuth, async (req, res) => {
  try {
    // Ownership is verified inside the service by session lookup, but we also
    // scope to the current patient here for defense in depth.
    const sessionId = req.params.id;
    const sessions = await chatService.listSessions(req.patient.partnerId);
    const ownsSession = sessions.some((s) => s.id === sessionId);
    if (!ownsSession) {
      return res.status(404).json({ error: 'Session not found', code: 'SESSION_NOT_FOUND' });
    }

    const result = await learnFromResolvedSession(sessionId);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[patientChat] learn error:', err);
    return res.status(err.status || 500).json({
      error: err.message || 'Server error',
      code: err.code || 'SERVER_ERROR',
    });
  }
});

module.exports = router;

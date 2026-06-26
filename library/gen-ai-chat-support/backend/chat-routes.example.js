/**
 * @crossref:domain[patient-portal]
 * @crossref:route[/api/patient/chat]
 * @crossref:used-in[nk-patient-app chat screen]
 * @crossref:uses[api/src/services/ai/chatService.js, api/src/middleware/patientAuth.js]
 *
 * Reference Express route layout for patient chat endpoints.
 */

'use strict';
const express = require('express');
const { requirePatientAuth } = require('../../middleware/patientAuth');
const chatService = require('../../services/ai/chatService');

const router = express.Router();

router.get('/sessions', requirePatientAuth, async (req, res) => {
  const sessions = await chatService.listSessions(req.patient.partnerId);
  res.json({ success: true, sessions });
});

router.post('/sessions', requirePatientAuth, async (req, res) => {
  const session = await chatService.createSession(req.patient.partnerId);
  res.status(201).json({ success: true, session });
});

router.get('/sessions/:id/messages', requirePatientAuth, async (req, res) => {
  const messages = await chatService.listMessages(req.params.id, req.patient.partnerId);
  res.json({ success: true, messages });
});

router.post('/sessions/:id/messages', requirePatientAuth, async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'content is required', code: 'MISSING_FIELDS' });
  }

  const result = await chatService.sendMessage({
    sessionId: req.params.id,
    partnerId: req.patient.partnerId,
    content: content.trim(),
  });

  res.json({ success: true, ...result });
});

router.post('/sessions/:id/escalate', requirePatientAuth, async (req, res) => {
  const { reason } = req.body;
  const ticketId = await chatService.escalateToHuman({
    sessionId: req.params.id,
    partnerId: req.patient.partnerId,
    reason: reason || 'patient_requested',
  });
  res.json({ success: true, ticketId });
});

module.exports = router;

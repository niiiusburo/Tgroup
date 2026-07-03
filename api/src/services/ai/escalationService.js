/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[api/src/services/ai/chatService.js]
 * @crossref:uses[dbo.support_tickets, product-map/domains/patient-portal.yaml]
 *
 * Detects when a patient chat should be handed off to a human agent.
 *
 * Strategy: let the AI answer as much as possible. Escalate only when the
 * patient explicitly asks for staff, expresses strong frustration/complaint,
 * or raises medical/diagnosis/emergency topics that must be handled by a
 * clinician. Missing KB context no longer triggers escalation so the bot can
 * answer general questions with its base knowledge.
 */

'use strict';

const STAFF_REQUEST_KEYWORDS = [
  'gặp nhân viên',
  'gặp chuyên viên',
  'gặp bác sĩ',
  'gặp y tá',
  'gặp lễ tân',
  'gọi điện',
  'gọi lại',
  'liên hệ nhân viên',
  'nói chuyện với người thật',
  'gặp người thật',
  'chuyển nhân viên',
  'chuyển bác sĩ',
];

const FRUSTRATION_KEYWORDS = [
  'bực bội',
  'phàn nàn',
  'tức giận',
  'bất mãn',
  'tệ quá',
  'tồi tệ',
  'quá tệ',
  'không chấp nhận',
  'kiện',
  'khiếu nại',
];

const MEDICAL_KEYWORDS = [
  'chẩn đoán',
  'bệnh',
  'triệu chứng',
  'thuốc',
  'kháng sinh',
  'đau',
  'sưng',
  'nhiễm trùng',
  'cấp cứu',
  'khẩn cấp',
  'chảy máu',
  'sốt',
  'mưng mủ',
  'viêm',
  'nhiễm',
];

function checkEscalation(patientMessage, aiResponse) {
  const normalized = patientMessage.toLowerCase();

  if (STAFF_REQUEST_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return { shouldEscalate: true, reason: 'patient_requested', note: 'Patient asked for human staff.' };
  }

  if (MEDICAL_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return { shouldEscalate: true, reason: 'medical_topic', note: 'Medical/diagnosis topic detected.' };
  }

  if (FRUSTRATION_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return { shouldEscalate: true, reason: 'explicit_frustration', note: 'Strong frustration/complaint detected.' };
  }

  return { shouldEscalate: false };
}

async function createEscalationTicket({ db, partnerId, sessionId, reason, summary }) {
  const result = await db(
    `INSERT INTO dbo.support_tickets
       (partner_id, type, subject, description, status)
     VALUES ($1, $2, $3, $4, 'open')
     RETURNING id`,
    [
      partnerId,
      'chat_escalation',
      `Yêu cầu hỗ trợ từ chat AI (${reason})`,
      `Session: ${sessionId}\nSummary: ${summary || ''}`,
    ]
  );
  return result[0].id;
}

module.exports = {
  checkEscalation,
  createEscalationTicket,
};

/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[api/src/services/ai]
 * @crossref:uses[dbo.support_tickets, product-map/domains/patient-portal.yaml]
 *
 * Human escalation detection and ticket creation.
 */

export type EscalationReason =
  | 'patient_requested'
  | 'low_confidence'
  | 'medical_topic'
  | 'no_knowledge_context'
  | 'explicit_frustration';

export interface EscalationCheck {
  shouldEscalate: boolean;
  reason?: EscalationReason;
  note?: string;
}

const ESCALATION_KEYWORDS = [
  'gặp nhân viên',
  'gặp chuyên viên',
  'gặp bác sĩ',
  'gọi điện',
  'gọi lại',
  'liên hệ nhân viên',
  'nói chuyện với ngườithật',
  'không hiểu',
  'không đúng',
  'bực bội',
  'phàn nàn',
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
];

/**
 * Rule-based escalation detector.
 * Can be replaced with an LLM self-evaluation call in production.
 */
export function checkEscalation(
  patientMessage: string,
  aiResponse: string,
  retrievedChunksCount: number
): EscalationCheck {
  const normalized = patientMessage.toLowerCase();

  if (ESCALATION_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return { shouldEscalate: true, reason: 'patient_requested', note: 'Patient asked for human staff.' };
  }

  if (MEDICAL_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return { shouldEscalate: true, reason: 'medical_topic', note: 'Medical/diagnosis topic detected.' };
  }

  if (retrievedChunksCount === 0) {
    return {
      shouldEscalate: true,
      reason: 'no_knowledge_context',
      note: 'No relevant knowledge chunks retrieved.',
    };
  }

  const uncertaintyMarkers = ['tôi không chắc', 'tôi không biết', 'không có thông tin', 'xin lỗi, tôi không thể'];
  if (uncertaintyMarkers.some((m) => aiResponse.toLowerCase().includes(m))) {
    return { shouldEscalate: true, reason: 'low_confidence', note: 'AI expressed uncertainty.' };
  }

  return { shouldEscalate: false };
}

export interface EscalationTicketInput {
  db: (sql: string, params: unknown[]) => Promise<any[]>;
  partnerId: string;
  sessionId: string;
  reason: EscalationReason;
  summary: string;
}

export async function createEscalationTicket(input: EscalationTicketInput): Promise<string> {
  const result = await input.db(
    `INSERT INTO dbo.support_tickets
       (partner_id, type, subject, description, status)
     VALUES ($1, $2, $3, $4, 'open')
     RETURNING id`,
    [
      input.partnerId,
      'chat_escalation',
      `Yêu cầu hỗ trợ từ chat AI (${input.reason})`,
      `Session: ${input.sessionId}\nSummary: ${input.summary}`,
    ]
  );

  return result[0].id;
}

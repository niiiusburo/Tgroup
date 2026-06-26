/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[nk-patient-app chat screen]
 * @crossref:uses[src/services/api.ts, docs/CONTRACTS.md]
 *
 * Mobile API wrappers for patient chat endpoints.
 */

import api from '../services/api';

export interface ChatSession {
  id: string;
  status: 'ai' | 'human' | 'closed';
  ticket_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'patient' | 'ai' | 'staff' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export async function listChatSessions(): Promise<ChatSession[]> {
  const res = await api.get('/chat/sessions');
  return res.data.sessions ?? [];
}

export async function createChatSession(): Promise<ChatSession> {
  const res = await api.post('/chat/sessions');
  return res.data.session;
}

export async function listChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const res = await api.get(`/chat/sessions/${sessionId}/messages`);
  return res.data.messages ?? [];
}

export interface SendMessageResult {
  reply: string;
  escalated: boolean;
  reason?: string;
}

export async function sendChatMessage(
  sessionId: string,
  content: string
): Promise<SendMessageResult> {
  const res = await api.post(`/chat/sessions/${sessionId}/messages`, { content });
  return res.data;
}

export async function escalateToHuman(sessionId: string, reason?: string): Promise<string> {
  const res = await api.post(`/chat/sessions/${sessionId}/escalate`, { reason });
  return res.data.ticketId;
}

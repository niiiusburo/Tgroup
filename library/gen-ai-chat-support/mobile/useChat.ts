/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[nk-patient-app ChatScreen]
 * @crossref:uses[mobile/chat-api.ts]
 *
 * Reference React hook for managing chat session state.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  createChatSession,
  listChatMessages,
  sendChatMessage,
  escalateToHuman,
  type ChatMessage,
} from './chat-api';

export interface UseChatOptions {
  sessionId?: string;
}

export interface UseChatState {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  sessionId: string | null;
}

export interface UseChatActions {
  sendMessage: (text: string) => Promise<void>;
  escalate: (reason?: string) => Promise<void>;
  retry: () => void;
}

export function useChat(options: UseChatOptions = {}): UseChatState & UseChatActions {
  const [sessionId, setSessionId] = useState<string | null>(options.sessionId ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or load session
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const sid = options.sessionId ?? (await createChatSession()).id;
        if (cancelled) return;
        setSessionId(sid);
        const history = await listChatMessages(sid);
        if (cancelled) return;
        setMessages(history);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.response?.data?.error || 'Không thể tải cuộc trò chuyện');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [options.sessionId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!sessionId || !text.trim() || sending) return;

    const patientMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'patient',
      content: text.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, patientMessage]);
    setSending(true);
    setError(null);

    try {
      const result = await sendChatMessage(sessionId, text.trim());
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: result.reply,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Gửi tin nhắn thất bại');
    } finally {
      setSending(false);
    }
  }, [sessionId, sending]);

  const escalate = useCallback(async (reason?: string) => {
    if (!sessionId) return;
    setSending(true);
    try {
      await escalateToHuman(sessionId, reason);
      const systemMessage: ChatMessage = {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: 'Đã chuyển yêu cầu đến nhân viên hỗ trợ. Bạn sẽ nhận được phản hồi sớm.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Chuyển tiếp thất bại');
    } finally {
      setSending(false);
    }
  }, [sessionId]);

  const retry = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    loading,
    sending,
    error,
    sessionId,
    sendMessage,
    escalate,
    retry,
  };
}

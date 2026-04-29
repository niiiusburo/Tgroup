import { apiFetch } from './core';

// ─── Feedback ─────────────────────────────────────────────────────

import type {
  FeedbackStatus,
  FeedbackThread,
  AdminFeedbackThread,
  FeedbackMessage,
  FeedbackThreadDetail,
} from '@/types/feedback';

export async function fetchMyFeedback(): Promise<{ items: FeedbackThread[] }> {
  return apiFetch('/Feedback/my');
}

export async function fetchMyFeedbackThread(threadId: string): Promise<FeedbackThreadDetail> {
  return apiFetch(`/Feedback/my/${encodeURIComponent(threadId)}`);
}

export async function createFeedback(data: {
  content: string;
  pagePath?: string;
  screenSize?: string;
  files?: File[];
}): Promise<FeedbackThread> {
  const { files, ...rest } = data;
  if (files && files.length > 0) {
    const form = new FormData();
    form.append('content', rest.content);
    if (rest.pagePath) form.append('pagePath', rest.pagePath);
    if (rest.screenSize) form.append('screenSize', rest.screenSize);
    files.forEach((file) => form.append('files', file));
    return apiFetch('/Feedback', { method: 'POST', body: form as unknown as Record<string, unknown> });
  }
  return apiFetch('/Feedback', { method: 'POST', body: rest });
}

export async function replyToMyFeedbackThread(
  threadId: string,
  content: string,
  files?: File[]
): Promise<FeedbackMessage> {
  if (files && files.length > 0) {
    const form = new FormData();
    form.append('content', content);
    files.forEach((file) => form.append('files', file));
    return apiFetch(`/Feedback/my/${encodeURIComponent(threadId)}/reply`, {
      method: 'POST',
      body: form as unknown as Record<string, unknown>,
    });
  }
  return apiFetch(`/Feedback/my/${encodeURIComponent(threadId)}/reply`, {
    method: 'POST',
    body: { content },
  });
}

export async function fetchAllFeedback(source?: 'manual' | 'auto'): Promise<{ items: AdminFeedbackThread[] }> {
  const params = source ? `?source=${source}` : '';
  return apiFetch(`/Feedback/all${params}`);
}

export async function fetchAdminFeedbackThread(threadId: string): Promise<FeedbackThreadDetail> {
  return apiFetch(`/Feedback/all/${encodeURIComponent(threadId)}`);
}

export async function replyToFeedbackThread(
  threadId: string,
  content: string,
  files?: File[]
): Promise<FeedbackMessage> {
  if (files && files.length > 0) {
    const form = new FormData();
    form.append('content', content);
    files.forEach((file) => form.append('files', file));
    return apiFetch(`/Feedback/all/${encodeURIComponent(threadId)}/reply`, {
      method: 'POST',
      body: form as unknown as Record<string, unknown>,
    });
  }
  return apiFetch(`/Feedback/all/${encodeURIComponent(threadId)}/reply`, {
    method: 'POST',
    body: { content },
  });
}

export async function updateFeedbackStatus(
  threadId: string,
  status: FeedbackStatus
): Promise<FeedbackThread> {
  return apiFetch(`/Feedback/all/${encodeURIComponent(threadId)}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

export async function deleteFeedbackThread(threadId: string): Promise<void> {
  return apiFetch(`/Feedback/all/${encodeURIComponent(threadId)}`, {
    method: 'DELETE',
  });
}

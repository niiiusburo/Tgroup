/**
 * @crossref:domain[feedback-cms]
 * @crossref:used-in[Feedback API client; website/src/lib/api.ts (barrel), website/src/components/shared/FeedbackWidget.tsx, website/src/components/settings/FeedbackAdminContent.tsx]
 * @crossref:uses[website/src/lib/api/core.ts, website/src/types/feedback.ts, api/src/routes/feedback.js, api/src/routes/feedback/userRoutes.js, api/src/routes/feedback/adminRoutes.js, product-map/domains/feedback-cms.yaml]
 * Calls /api/Feedback/* (my/all threads, replies, status, unread-count).
 */
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

export interface FeedbackUnreadCount {
  count: number;
  role: 'admin' | 'staff';
}

export async function fetchFeedbackUnreadCount(): Promise<FeedbackUnreadCount> {
  return apiFetch<FeedbackUnreadCount>('/Feedback/unread-count');
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

function postFeedbackReply(path: string, content: string, files?: File[]): Promise<FeedbackMessage> {
  if (files && files.length > 0) {
    const form = new FormData();
    form.append('content', content);
    files.forEach((file) => form.append('files', file));
    return apiFetch(path, {
      method: 'POST',
      body: form as unknown as Record<string, unknown>,
    });
  }
  return apiFetch(path, {
    method: 'POST',
    body: { content },
  });
}

export async function replyToMyFeedbackThread(
  threadId: string,
  content: string,
  files?: File[]
): Promise<FeedbackMessage> {
  return postFeedbackReply(`/Feedback/my/${encodeURIComponent(threadId)}/reply`, content, files);
}

export interface FetchAllFeedbackParams {
  source?: 'manual' | 'auto';
  host?: string;
}

export async function fetchAllFeedback(
  params?: 'manual' | 'auto' | FetchAllFeedbackParams
): Promise<{ items: AdminFeedbackThread[] }> {
  const filters = typeof params === 'string' ? { source: params } : (params ?? {});
  return apiFetch('/Feedback/all', {
    params: {
      source: filters.source,
      host: filters.host,
    },
  });
}

export async function fetchAdminFeedbackThread(threadId: string): Promise<FeedbackThreadDetail> {
  return apiFetch(`/Feedback/all/${encodeURIComponent(threadId)}`);
}

export async function replyToFeedbackThread(
  threadId: string,
  content: string,
  files?: File[]
): Promise<FeedbackMessage> {
  return postFeedbackReply(`/Feedback/all/${encodeURIComponent(threadId)}/reply`, content, files);
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

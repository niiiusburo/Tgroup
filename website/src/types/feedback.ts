/**
 * Feedback system types
 */

export type FeedbackStatus = 'pending' | 'in_progress' | 'resolved' | 'ignored';

export interface FeedbackAttachment {
  id: string;
  messageId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
}

export interface FeedbackThread {
  id: string;
  pageUrl: string | null;
  pagePath: string | null;
  status: FeedbackStatus;
  source: 'manual' | 'auto';
  errorEventId?: string | null;
  createdAt: string;
  updatedAt: string;
  firstMessage?: string | null;
  latestReply?: string | null;
}

export interface ErrorEvent {
  errorType: string;
  errorMessage: string;
  errorStack: string | null;
  errorComponentStack: string | null;
  errorSourceFile: string | null;
  errorSourceLine: number | null;
  errorRoute: string | null;
  errorApiEndpoint: string | null;
  errorApiMethod: string | null;
  errorApiStatus: number | null;
  errorApiBody: unknown | null;
  errorOccurrenceCount: number;
  errorFirstSeenAt: string;
  errorLastSeenAt: string;
  errorEventStatus: string;
  errorFixSummary: string | null;
  errorFixCommit: string | null;
}

export interface AdminFeedbackThread extends FeedbackThread {
  employeeId: string;
  employeeName: string;
  errorType?: string;
  errorMessage?: string;
  errorStack?: string | null;
  errorComponentStack?: string | null;
  errorSourceFile?: string | null;
  errorSourceLine?: number | null;
  errorRoute?: string | null;
  errorApiEndpoint?: string | null;
  errorApiMethod?: string | null;
  errorApiStatus?: number | null;
  errorOccurrenceCount?: number;
  errorFirstSeenAt?: string;
  errorLastSeenAt?: string;
  errorEventStatus?: string;
  errorFixSummary?: string | null;
  errorFixCommit?: string | null;
}

export interface FeedbackMessage {
  id: string;
  authorId: string | null;
  authorName: string | null;
  content: string;
  createdAt: string;
  attachments?: FeedbackAttachment[];
}

export interface FeedbackThreadDetail {
  thread: FeedbackThread & {
    employeeId?: string;
    employeeName?: string;
    screenSize?: string | null;
    userAgent?: string | null;
  };
  messages: FeedbackMessage[];
}

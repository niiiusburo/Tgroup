import { Bug, Loader2, MessageSquare, Paperclip, Send, X, FileCode, Hash, Clock, Route, Globe, GitCommit, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getUploadUrl } from '@/lib/api';
import type { AdminFeedbackThread, FeedbackMessage } from '@/types/feedback';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function formatFeedbackTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getFeedbackInitials(name: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentThumbnails({ attachments }: { attachments?: { url: string; originalName: string; sizeBytes: number }[] }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((att) => {
        const src = getUploadUrl(att.url);
        return (
          <a
            key={att.url}
            href={src}
            target="_blank"
            rel="noreferrer"
            className="group relative block w-24 h-24 rounded-lg border border-gray-200 overflow-hidden bg-gray-50"
            title={att.originalName}
          >
            <img
              src={src}
              alt={att.originalName}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                console.error('Failed to load attachment image:', src);
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </a>
        );
      })}
    </div>
  );
}

function ErrorTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    React: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    API: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    Network: 'bg-purple-50 text-purple-700 ring-purple-600/20',
    Global: 'bg-red-50 text-red-700 ring-red-600/20',
    UnhandledRejection: 'bg-orange-50 text-orange-700 ring-orange-600/20',
    Console: 'bg-gray-50 text-gray-700 ring-gray-500/20',
    Server: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  };
  const style = colors[type] || 'bg-gray-50 text-gray-700 ring-gray-500/20';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}>
      {type}
    </span>
  );
}

function ErrorEventStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: 'bg-red-50 text-red-700 ring-red-600/20',
    investigating: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    fix_in_progress: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    fix_verified: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    deployed: 'bg-green-50 text-green-700 ring-green-600/20',
    duplicate: 'bg-gray-50 text-gray-600 ring-gray-500/20',
    won_t_fix: 'bg-gray-50 text-gray-600 ring-gray-500/20',
    manual_review: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  };
  const style = colors[status] || 'bg-gray-50 text-gray-600 ring-gray-500/20';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}>
      {label}
    </span>
  );
}

function AutoErrorDetail({ thread }: { thread: AdminFeedbackThread }) {
  const hasStack = thread.errorStack && thread.errorStack.length > 0;
  const hasSource = thread.errorSourceFile;

  return (
    <div className="space-y-4">
      {/* Error header */}
      <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <ErrorTypeBadge type={thread.errorType || 'Unknown'} />
          {thread.errorEventStatus && (
            <ErrorEventStatusBadge status={thread.errorEventStatus} />
          )}
          {thread.errorOccurrenceCount !== undefined && thread.errorOccurrenceCount > 1 && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20">
              <Hash className="w-3 h-3" />
              {thread.errorOccurrenceCount} occurrences
            </span>
          )}
        </div>

        <p className="text-sm font-medium text-gray-900">
          {thread.errorMessage || 'No message'}
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          {thread.errorRoute && (
            <span className="inline-flex items-center gap-1">
              <Route className="w-3 h-3" />
              {thread.errorRoute}
            </span>
          )}
          {hasSource && (
            <span className="inline-flex items-center gap-1">
              <FileCode className="w-3 h-3" />
              {thread.errorSourceFile}
              {thread.errorSourceLine !== null && `:${thread.errorSourceLine}`}
            </span>
          )}
          {thread.errorApiEndpoint && (
            <span className="inline-flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {thread.errorApiMethod || 'GET'} {thread.errorApiEndpoint}
              {thread.errorApiStatus !== null && ` (${thread.errorApiStatus})`}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
          {thread.errorFirstSeenAt && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              First: {formatFeedbackTime(thread.errorFirstSeenAt)}
            </span>
          )}
          {thread.errorLastSeenAt && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last: {formatFeedbackTime(thread.errorLastSeenAt)}
            </span>
          )}
        </div>

        {thread.errorFixSummary && (
          <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg p-2">
            <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium">Fix: </span>
              {thread.errorFixSummary}
              {thread.errorFixCommit && (
                <span className="inline-flex items-center gap-1 ml-1 text-emerald-600">
                  <GitCommit className="w-3 h-3" />
                  {thread.errorFixCommit.slice(0, 7)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stack trace */}
      {hasStack && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stack Trace</h4>
          <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-all">
              {thread.errorStack}
            </pre>
          </div>
        </div>
      )}

      {/* Component stack */}
      {thread.errorComponentStack && thread.errorComponentStack.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Component Stack</h4>
          <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-all">
              {thread.errorComponentStack}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

interface FeedbackAdminDetailModalProps {
  readonly threadId: string | null;
  readonly detail: { thread: AdminFeedbackThread; messages: FeedbackMessage[] } | null;
  readonly loadingDetail: boolean;
  readonly canEdit: boolean;
  readonly files: File[];
  readonly filePreviews: string[];
  readonly fileError: string | null;
  readonly sendError: string | null;
  readonly sending: boolean;
  readonly replyInput: string;
  readonly fileInputRef: React.RefObject<HTMLInputElement>;
  readonly onClose: () => void;
  readonly onFilesChange: (files: File[]) => void;
  readonly onFileInputChange: (selected: FileList | null) => void;
  readonly onReplyInputChange: (value: string) => void;
  readonly onReplyKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  readonly onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  readonly onSendReply: () => void;
}

export function FeedbackAdminDetailModal({
  threadId,
  detail,
  loadingDetail,
  canEdit,
  files,
  filePreviews,
  fileError,
  sendError,
  sending,
  replyInput,
  fileInputRef,
  onClose,
  onFilesChange,
  onFileInputChange,
  onReplyInputChange,
  onReplyKeyDown,
  onPaste,
  onSendReply,
}: FeedbackAdminDetailModalProps) {
  const { t } = useTranslation('settings');
  if (!threadId || !detail) return null;

  const isAuto = detail.thread.source === 'auto';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isAuto ? 'bg-red-50' : 'bg-primary/10'}`}>
              {isAuto
                ? <Bug className="w-4 h-4 text-red-500" />
                : <MessageSquare className="w-4 h-4 text-primary" />
              }
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {isAuto ? 'Error Detail' : 'Feedback Detail'}
              </h2>
              <p className="text-xs text-gray-500">
                {isAuto
                  ? `Auto-detected • ${detail.thread.pagePath || detail.thread.pageUrl || 'Unknown'} • ${formatFeedbackTime(detail.thread.createdAt)}`
                  : `${detail.thread.employeeName} • ${detail.thread.pagePath || detail.thread.pageUrl || 'Unknown page'} • ${formatFeedbackTime(detail.thread.createdAt)}`
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[300px]">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* Auto error structured detail */}
              {isAuto && <AutoErrorDetail thread={detail.thread} />}

              {/* Messages / Thread replies */}
              {detail.messages.length > 0 && (
                <div className="space-y-4 pt-2">
                  {!isAuto && (
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Conversation</h4>
                  )}
                  {isAuto && (
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Discussion</h4>
                  )}
                  {detail.messages.map((msg) => {
                    const isAdmin = msg.authorId !== detail.thread.employeeId;
                    return (
                      <div key={msg.id} className={`flex gap-3 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] text-primary font-semibold">{getFeedbackInitials(msg.authorName)}</span>
                        </div>
                        <div
                          className={`rounded-xl px-4 py-2 text-sm max-w-[75%] ${
                            isAdmin
                              ? 'bg-primary text-white rounded-tr-none'
                              : 'bg-gray-100 text-gray-800 rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <AttachmentThumbnails attachments={msg.attachments} />
                          <p className={`text-[10px] mt-1 ${isAdmin ? 'text-white/70' : 'text-gray-500'}`}>
                            {msg.authorName || 'Unknown'} • {formatFeedbackTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {canEdit && (
          <div className="border-t border-gray-100 p-4 bg-white space-y-2">
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filePreviews.map((url, idx) => (
                  <div
                    key={url}
                    className="relative w-16 h-16 rounded-lg border border-gray-200 overflow-hidden bg-gray-50"
                    title={`${files[idx].name} • ${formatFileSize(files[idx].size)}`}
                  >
                    <img src={url} alt={files[idx].name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => onFilesChange(files.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/50 text-white hover:bg-black/70"
                      aria-label="Remove file"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {sendError && <p className="text-xs text-red-600">{sendError}</p>}
            {fileError && <p className="text-xs text-red-600">{fileError}</p>}
            <div className="flex items-end gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept={ALLOWED_TYPES.join(',')}
                multiple
                onChange={(e) => onFileInputChange(e.target.files)}
              />
              <textarea
                value={replyInput}
                onChange={(e) => onReplyInputChange(e.target.value)}
                onKeyDown={onReplyKeyDown}
                onPaste={onPaste}
                placeholder={t('enterNotePlaceholder', { ns: 'payment' })}
                rows={2}
                className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                aria-label="Attach image"
                title="Attach image"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={(!replyInput.trim() && files.length === 0) || sending}
                onClick={onSendReply}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

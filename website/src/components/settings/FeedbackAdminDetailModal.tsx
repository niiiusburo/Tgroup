import { Bug, Loader2, MessageSquare, Paperclip, Send, X } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${detail.thread.source === 'auto' ? 'bg-red-50' : 'bg-primary/10'}`}>
              {detail.thread.source === 'auto'
                ? <Bug className="w-4 h-4 text-red-500" />
                : <MessageSquare className="w-4 h-4 text-primary" />
              }
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {detail.thread.source === 'auto' ? 'Error Detail' : 'Feedback Detail'}
              </h2>
              <p className="text-xs text-gray-500">
                {detail.thread.source === 'auto'
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
            detail.messages.map((msg) => {
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
            })
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

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, ArrowLeft, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchMyFeedback,
  fetchMyFeedbackThread,
  createFeedback,
  replyToMyFeedbackThread,
} from '@/lib/api';
import type { FeedbackThread, FeedbackMessage, FeedbackStatus } from '@/types/feedback';

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  in_progress: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  ignored: 'bg-gray-50 text-gray-600 ring-gray-500/20',
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  ignored: 'Ignored',
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function FeedbackWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<FeedbackThread[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ thread: FeedbackThread; messages: FeedbackMessage[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetchMyFeedback();
      setThreads(res.items);
    } catch (err) {
      console.error('Failed to load feedback threads:', err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadThreads();
      setSelectedThreadId(null);
      setDetail(null);
      setInput('');
    }
  }, [open, loadThreads]);

  useEffect(() => {
    if (!selectedThreadId || !open) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    fetchMyFeedbackThread(selectedThreadId)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch((err) => console.error('Failed to load thread detail:', err))
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedThreadId, open]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      if (selectedThreadId && detail) {
        const msg = await replyToMyFeedbackThread(selectedThreadId, content);
        setDetail((prev) => (prev ? { ...prev, messages: [...prev.messages, msg] } : prev));
        // Refresh list so updated_at is reflected
        loadThreads();
      } else {
        const screenSize = `${window.innerWidth}x${window.innerHeight}`;
        await createFeedback({
          content,
          pagePath: window.location.pathname,
          screenSize,
        });
        setInput('');
        await loadThreads();
      }
      setInput('');
    } catch (err) {
      console.error('Failed to send feedback:', err);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const title = selectedThreadId && detail ? 'Feedback Detail' : 'Your Feedback';

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors duration-150"
        aria-label="Feedback"
      >
        <MessageSquare className="w-5 h-5 text-gray-500" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-96 max-h-[80vh] flex flex-col bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2">
              {selectedThreadId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedThreadId(null);
                    setDetail(null);
                  }}
                  className="p-1 rounded-md hover:bg-gray-200 text-gray-600"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <h3 className="font-semibold text-gray-900">{title}</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-md hover:bg-gray-200 text-gray-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[320px] max-h-[420px]">
            {!selectedThreadId ? (
              <>
                {loadingList ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  </div>
                ) : threads.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">No feedback yet</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Spot something weird? Tell us what page you're on and what's happening.
                    </p>
                  </div>
                ) : (
                  threads.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedThreadId(t.id)}
                      className="w-full text-left rounded-xl border border-gray-100 bg-white hover:bg-gray-50 p-3 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${STATUS_STYLES[t.status]}`}
                        >
                          {STATUS_LABELS[t.status]}
                        </span>
                        <span className="text-[10px] text-gray-400">{formatTime(t.updatedAt)}</span>
                      </div>
                      <p className="text-sm text-gray-800 line-clamp-2">
                        {t.firstMessage || 'No message'}
                      </p>
                      {t.latestReply && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          <span className="font-medium text-primary">Reply:</span> {t.latestReply}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </>
            ) : (
              <>
                {loadingDetail || !detail ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {detail.messages.map((msg) => {
                      const isMe = msg.authorId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] text-primary font-semibold">
                              {getInitials(msg.authorName)}
                            </span>
                          </div>
                          <div
                            className={`rounded-xl px-3 py-2 text-sm max-w-[80%] ${
                              isMe
                                ? 'bg-primary text-white rounded-tr-none'
                                : 'bg-gray-100 text-gray-800 rounded-tl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <p
                              className={`text-[10px] mt-1 ${
                                isMe ? 'text-white/70' : 'text-gray-500'
                              }`}
                            >
                              {formatTime(msg.createdAt)}
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

          {/* Input */}
          <div className="border-t border-gray-100 p-3 bg-white">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedThreadId
                    ? 'Type a reply…'
                    : 'Tell us what page you\'re on and what\'s happening…'
                }
                rows={2}
                className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
              <button
                type="button"
                disabled={!input.trim() || sending}
                onClick={handleSend}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

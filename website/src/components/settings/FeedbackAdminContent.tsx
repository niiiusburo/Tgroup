import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Eye, Loader2, Send, X } from 'lucide-react';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusDropdown, type StatusOption } from '@/components/shared/StatusDropdown';
import {
  fetchAllFeedback,
  fetchAdminFeedbackThread,
  replyToFeedbackThread,
  updateFeedbackStatus,
} from '@/lib/api';
import type { AdminFeedbackThread, FeedbackMessage, FeedbackStatus } from '@/types/feedback';

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'pending', label: 'Pending', style: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  { value: 'in_progress', label: 'In Progress', style: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  { value: 'resolved', label: 'Resolved', style: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  { value: 'ignored', label: 'Ignored', style: 'bg-gray-50 text-gray-600 ring-gray-500/20' },
];

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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

export function FeedbackAdminContent() {
  const [threads, setThreads] = useState<AdminFeedbackThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalThreadId, setModalThreadId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ thread: AdminFeedbackThread; messages: FeedbackMessage[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const [sending, setSending] = useState(false);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAllFeedback();
      setThreads(res.items);
    } catch (err) {
      console.error('Failed to load admin feedback:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!modalThreadId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    fetchAdminFeedbackThread(modalThreadId)
      .then((res) => {
        if (!cancelled) {
          const t = threads.find((th) => th.id === modalThreadId);
          setDetail({
            thread: { ...(res.thread as unknown as AdminFeedbackThread), ...(t ?? {}) },
            messages: res.messages,
          });
        }
      })
      .catch((err) => console.error('Failed to load thread detail:', err))
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [modalThreadId, threads]);

  async function handleStatusChange(thread: AdminFeedbackThread, newStatus: string) {
    const original = [...threads];
    setThreads((prev) =>
      prev.map((t) => (t.id === thread.id ? { ...t, status: newStatus as FeedbackStatus } : t))
    );
    try {
      await updateFeedbackStatus(thread.id, newStatus as FeedbackStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
      setThreads(original);
    }
  }

  async function handleSendReply() {
    const content = replyInput.trim();
    if (!content || !modalThreadId || !detail || sending) return;

    setSending(true);
    try {
      const msg = await replyToFeedbackThread(modalThreadId, content);
      setDetail((prev) => (prev ? { ...prev, messages: [...prev.messages, msg] } : prev));
      setReplyInput('');
      await loadThreads();
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  }

  function handleReplyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  }

  const columns: Column<AdminFeedbackThread>[] = [
    {
      key: 'employeeName',
      header: 'Employee',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-[10px] text-primary font-semibold">{getInitials(row.employeeName)}</span>
          </div>
          <span className="font-medium text-gray-900">{row.employeeName}</span>
        </div>
      ),
    },
    {
      key: 'pagePath',
      header: 'Page',
      sortable: true,
      render: (row) => <span className="text-gray-600">{row.pagePath || row.pageUrl || '—'}</span>,
    },
    {
      key: 'firstMessage',
      header: 'Preview',
      sortable: false,
      render: (row) => (
        <p className="text-sm text-gray-700 line-clamp-1 max-w-xs" title={row.firstMessage || undefined}>
          {row.firstMessage || '—'}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <StatusDropdown
          current={row.status}
          options={STATUS_OPTIONS}
          onChange={(val) => handleStatusChange(row, val)}
        />
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      sortable: true,
      render: (row) => <span className="text-sm text-gray-500">{formatTime(row.updatedAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      width: '100px',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalThreadId(row.id)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Employee Feedback</h3>
          <p className="text-sm text-gray-500">Review and respond to feedback submitted by employees.</p>
        </div>
        {loading && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
      </div>

      <DataTable
        columns={columns}
        data={threads}
        keyExtractor={(row) => row.id}
        pageSize={10}
        emptyMessage="No feedback submissions yet."
      />

      {/* Detail Modal */}
      {modalThreadId && detail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setModalThreadId(null)}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Feedback Detail</h2>
                  <p className="text-xs text-gray-500">
                    {detail.thread.employeeName} • {detail.thread.pagePath || detail.thread.pageUrl || 'Unknown page'} •{' '}
                    {formatTime(detail.thread.createdAt)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalThreadId(null)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
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
                        <span className="text-[10px] text-primary font-semibold">{getInitials(msg.authorName)}</span>
                      </div>
                      <div
                        className={`rounded-xl px-4 py-2 text-sm max-w-[75%] ${
                          isAdmin
                            ? 'bg-primary text-white rounded-tr-none'
                            : 'bg-gray-100 text-gray-800 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isAdmin ? 'text-white/70' : 'text-gray-500'}`}>
                          {msg.authorName || 'Unknown'} • {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply input */}
            <div className="border-t border-gray-100 p-4 bg-white">
              <div className="flex items-end gap-2">
                <textarea
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  onKeyDown={handleReplyKeyDown}
                  placeholder="Type a reply…"
                  rows={2}
                  className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
                <button
                  type="button"
                  disabled={!replyInput.trim() || sending}
                  onClick={handleSendReply}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

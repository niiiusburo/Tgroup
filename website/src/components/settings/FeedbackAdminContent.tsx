import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Loader2, Trash2, Bug, Users, Hash, FileCode } from 'lucide-react';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusDropdown, type StatusOption } from '@/components/shared/StatusDropdown';
import { usePasteImage } from '@/hooks/usePasteImage';
import {
  fetchAllFeedback,
  fetchAdminFeedbackThread,
  replyToFeedbackThread,
  updateFeedbackStatus,
  deleteFeedbackThread,
} from '@/lib/api';
import type { AdminFeedbackThread, FeedbackMessage, FeedbackStatus } from '@/types/feedback';
import {
  FeedbackAdminDetailModal,
  formatFeedbackTime,
  getFeedbackInitials,
} from './FeedbackAdminDetailModal';

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'pending', label: 'Pending', style: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  { value: 'in_progress', label: 'In Progress', style: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  { value: 'resolved', label: 'Resolved', style: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  { value: 'ignored', label: 'Ignored', style: 'bg-gray-50 text-gray-600 ring-gray-500/20' },
];

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

function useObjectUrls(files: File[]) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => {
      next.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);
  return urls;
}

type FeedbackSource = 'manual' | 'auto';

interface FeedbackAdminContentProps {
  readonly canEdit?: boolean;
}

export function FeedbackAdminContent({ canEdit = false }: FeedbackAdminContentProps) {
  const { t } = useTranslation('settings');
  const [activeTab, setActiveTab] = useState<FeedbackSource>('manual');
  const [threads, setThreads] = useState<AdminFeedbackThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [modalThreadId, setModalThreadId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ thread: AdminFeedbackThread; messages: FeedbackMessage[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const filePreviews = useObjectUrls(files);
  const [fileError, setFileError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePaste = usePasteImage({
    onFiles: (imgs) => setFiles((prev) => [...prev, ...imgs]),
    onError: setFileError,
    currentCount: files.length,
  });

  const loadThreads = useCallback(async (source?: FeedbackSource) => {
    setLoading(true);
    try {
      const res = await fetchAllFeedback(source);
      setThreads(res.items);
    } catch (err) {
      console.error('Failed to load admin feedback:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleSelect(id: string, selected: boolean) {
    if (!canEdit) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSelectAll(selected: boolean, pageIds: string[]) {
    if (!canEdit) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => {
        if (selected) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  }

  async function handleDeleteSelected() {
    if (!canEdit) return;
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} feedback item${selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => deleteFeedbackThread(id)));
      setSelectedIds(new Set());
      await loadThreads(activeTab);
    } catch (err) {
      console.error('Failed to delete feedback:', err);
      alert(t('feedbackAdmin.deleteError'));
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    loadThreads(activeTab);
  }, [loadThreads, activeTab]);

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
    if (!canEdit) return;
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

  function validateAndSetFiles(selected: FileList | null) {
    if (!canEdit) return;
    setFileError(null);
    setSendError(null);
    if (!selected || selected.length === 0) return;
    const newFiles = Array.from(selected);
    const total = files.length + newFiles.length;
    if (total > MAX_FILES) {
      setFileError(`You can only attach up to ${MAX_FILES} images.`);
      return;
    }
    const invalid = newFiles.find((f) => !ALLOWED_TYPES.includes(f.type));
    if (invalid) {
      setFileError('Only JPG, PNG, GIF, and WEBP images are allowed.');
      return;
    }
    const oversized = newFiles.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      setFileError('Each image must be smaller than 5 MB.');
      return;
    }
    setFiles((prev) => [...prev, ...newFiles]);
  }

  async function handleSendReply() {
    if (!canEdit) return;
    const content = replyInput.trim();
    if ((!content && files.length === 0) || !modalThreadId || !detail || sending) return;

    setSending(true);
    setSendError(null);
    try {
      const msg = await replyToFeedbackThread(modalThreadId, content, files.length > 0 ? files : undefined);
      setDetail((prev) => (prev ? { ...prev, messages: [...prev.messages, msg] } : prev));
      setReplyInput('');
      setFiles([]);
      await loadThreads(activeTab);
    } catch (err: unknown) {
      console.error('Failed to send reply:', err);
      const message = err instanceof Error ? err.message : 'Failed to send. Please try again.';
      setSendError(message);
    } finally {
      setSending(false);
    }
  }

  function handleReplyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (canEdit && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  }

  const isAutoTab = activeTab === 'auto';

  const autoColumns: Column<AdminFeedbackThread>[] = [
    {
      key: 'errorType',
      header: 'Type',
      sortable: true,
      width: '100px',
      render: (row) => {
        const type = row.errorType || 'Unknown';
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
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${style}`}>
            {type}
          </span>
        );
      },
    },
    {
      key: 'errorMessage',
      header: 'Error',
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-900 line-clamp-1 max-w-xs" title={row.errorMessage || undefined}>
            {row.errorMessage || '—'}
          </p>
          {row.errorSourceFile && (
            <p className="text-[10px] text-gray-400 inline-flex items-center gap-1">
              <FileCode className="w-3 h-3" />
              {row.errorSourceFile}{row.errorSourceLine !== null ? `:${row.errorSourceLine}` : ''}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'errorOccurrenceCount',
      header: 'Count',
      sortable: true,
      width: '80px',
      render: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-700">
          <Hash className="w-3.5 h-3.5 text-gray-400" />
          {row.errorOccurrenceCount ?? 1}
        </div>
      ),
    },
    {
      key: 'pagePath',
      header: 'Page',
      sortable: true,
      width: '140px',
      render: (row) => {
        const path = row.pagePath || row.pageUrl || row.errorRoute;
        if (!path) return <span className="text-gray-400">—</span>;
        return (
          <span className="text-xs text-gray-500 line-clamp-1" title={path}>
            {path}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '120px',
      render: (row) => (
        <StatusDropdown
          current={row.status}
          options={STATUS_OPTIONS}
          onChange={(val) => handleStatusChange(row, val)}
          disabled={!canEdit}
        />
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Seen',
      sortable: true,
      width: '120px',
      render: (row) => (
        <span className="text-xs text-gray-500">
          {row.errorLastSeenAt ? formatFeedbackTime(row.errorLastSeenAt) : formatFeedbackTime(row.updatedAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      width: '80px',
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

  const manualColumns: Column<AdminFeedbackThread>[] = [
    {
      key: 'employeeName',
      header: 'Employee',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-[10px] text-primary font-semibold">{getFeedbackInitials(row.employeeName)}</span>
          </div>
          <span className="font-medium text-gray-900">{row.employeeName}</span>
        </div>
      ),
    },
    {
      key: 'pagePath',
      header: 'Page',
      sortable: true,
      render: (row) => {
        const path = row.pagePath || row.pageUrl;
        if (!path) return <span className="text-gray-400">—</span>;
        return (
          <a
            href={path}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
            title={`Open ${path} in new tab`}
          >
            {path}
          </a>
        );
      },
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
          disabled={!canEdit}
        />
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      sortable: true,
      render: (row) => <span className="text-sm text-gray-500">{formatFeedbackTime(row.updatedAt)}</span>,
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

  const columns = isAutoTab ? autoColumns : manualColumns;

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => { setActiveTab('manual'); setSelectedIds(new Set()); }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
            activeTab === 'manual'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          User Feedback
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('auto'); setSelectedIds(new Set()); }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
            activeTab === 'auto'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Bug className="w-4 h-4" />
          Auto-detected Errors
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {isAutoTab ? 'Auto-detected Errors' : 'Employee Feedback'}
          </h3>
          <p className="text-sm text-gray-500">
            {isAutoTab
              ? `${threads.length} error${threads.length !== 1 ? 's' : ''} auto-captured from production. Click View to see stack traces, source locations, and occurrence counts.`
              : 'Review and respond to feedback submitted by employees.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && selectedIds.size > 0 && (
            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteSelected}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete {selectedIds.size}
            </button>
          )}
          {loading && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={threads}
        keyExtractor={(row) => row.id}
        pageSize={20}
        emptyMessage={t('feedbackAdmin.noFeedback', { ns: 'settings' })}
        selection={canEdit ? {
          selectedIds,
          onSelect: handleSelect,
          onSelectAll: (selected) => {
            const visibleIds = threads.map((t) => t.id);
            handleSelectAll(selected, visibleIds);
          },
        } : undefined}
      />

      <FeedbackAdminDetailModal
        threadId={modalThreadId}
        detail={detail}
        loadingDetail={loadingDetail}
        canEdit={canEdit}
        files={files}
        filePreviews={filePreviews}
        fileError={fileError}
        sendError={sendError}
        sending={sending}
        replyInput={replyInput}
        fileInputRef={fileInputRef}
        onClose={() => setModalThreadId(null)}
        onFilesChange={setFiles}
        onFileInputChange={validateAndSetFiles}
        onReplyInputChange={setReplyInput}
        onReplyKeyDown={handleReplyKeyDown}
        onPaste={canEdit ? handlePaste : undefined}
        onSendReply={handleSendReply}
      />
    </div>
  );
}

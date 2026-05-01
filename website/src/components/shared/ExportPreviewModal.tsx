import { useState } from 'react';
import { X, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import type { ExportPreviewResponse } from '@/lib/api/exports';

export interface ExportPreviewModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onDownload: () => void | Promise<void>;
  readonly preview: ExportPreviewResponse | null;
  readonly loading: boolean;
  readonly error: string | null;
}

export function ExportPreviewModal({
  isOpen,
  onClose,
  onDownload,
  preview,
  loading,
  error,
}: ExportPreviewModalProps) {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onDownload();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Xem trước xuất dữ liệu</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Đang tải thông tin...</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && preview && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Loại xuất</span>
                  <span className="text-sm font-medium text-gray-900">{preview.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Số dòng</span>
                  <span className="text-sm font-medium text-gray-900">
                    {preview.rowCount.toLocaleString('vi-VN')} dòng
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Tên file</span>
                  <span className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                    {preview.filename}
                  </span>
                </div>
              </div>

              {preview.summary.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tổng quan</p>
                  {preview.summary.map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{s.label}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {typeof s.value === 'number' ? s.value.toLocaleString('vi-VN') : s.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {preview.exceedsMax && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-amber-700 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Số dòng vượt quá giới hạn. Vui lòng thu hẹp bộ lọc.</span>
                </div>
              )}

              {preview.rowCount === 0 && (
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg text-gray-600 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Không có dữ liệu phù hợp với bộ lọc hiện tại.</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading || loading || !!error || !preview || preview.rowCount === 0 || preview.exceedsMax}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tải...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Tải Excel</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('exports');
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
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-[calc(100dvh-0.75rem)] min-h-0 w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:max-h-[90dvh] sm:rounded-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
          <h3 className="text-base font-semibold text-gray-900">{t('previewTitle')}</h3>
          <button type="button" onClick={onClose} aria-label={t('close')} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{t('loading')}</span>
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
                  <span className="text-sm text-gray-500">{t('exportType')}</span>
                  <span className="text-sm font-medium text-gray-900">{preview.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t('rowCount')}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {preview.rowCount.toLocaleString('vi-VN')} dòng
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t('filename')}</span>
                  <span className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                    {preview.filename}
                  </span>
                </div>
              </div>

              {preview.summary.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('summary')}</p>
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
                  <span>{t('exceedsMax')}</span>
                </div>
              )}

              {preview.rowCount === 0 && (
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg text-gray-600 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{t('noData')}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-6" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t('close')}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || loading || !!error || !preview || preview.rowCount === 0 || preview.exceedsMax}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('downloading')}</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                <span>{t('downloadExcel')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { previewExport, downloadExport } from '@/lib/api/exports';
import type { ExportPreviewResponse } from '@/lib/api/exports';

interface UseExportOptions {
  readonly type: string;
  readonly filters: Record<string, unknown>;
}

interface UseExportResult {
  readonly previewOpen: boolean;
  readonly previewData: ExportPreviewResponse | null;
  readonly loading: boolean;
  readonly downloading: boolean;
  readonly error: string | null;
  readonly openPreview: () => void;
  readonly closePreview: () => void;
  readonly handleDownload: () => Promise<void>;
  readonly handleDirectExport: () => Promise<void>;
}

export function useExport({ type, filters }: UseExportOptions): UseExportResult {
  const { t } = useTranslation('exports');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<ExportPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPreview = useCallback(() => {
    setPreviewOpen(true);
    setError(null);
    setPreviewData(null);
    setLoading(true);

    previewExport(type, filters)
      .then((data) => {
        setPreviewData(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t('previewError'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [type, filters]);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setError(null);
  }, []);

  const performDownload = useCallback(async () => {
    const blob = await downloadExport(type, filters);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = previewData?.filename || `${type}_export.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [type, filters, previewData]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setError(null);
    try {
      await performDownload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('downloadError'));
    } finally {
      setDownloading(false);
    }
  }, [performDownload]);

  const handleDirectExport = useCallback(async () => {
    setError(null);
    setDownloading(true);
    try {
      await performDownload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('directExportError'));
    } finally {
      setDownloading(false);
    }
  }, [performDownload]);

  return {
    previewOpen,
    previewData,
    loading,
    downloading,
    error,
    openPreview,
    closePreview,
    handleDownload,
    handleDirectExport,
  };
}

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusinessUnit } from '@/contexts/BusinessUnitContext';
import { previewExport, downloadExport } from '@/lib/api/exports';
import type { ExportPreviewResponse } from '@/lib/api/exports';

interface UseExportOptions {
  readonly type: string;
  readonly filters: Record<string, unknown>;
  /**
   * Force the LOB used for routing. Cross-LOB exports (e.g. CTV new-clients /
   * earnings / payouts whose builders query both DBs) pass 'dental' so the
   * request hits the plain /api/Exports mount instead of the cosmetic mirror,
   * regardless of the active business unit. Omit to follow currentLOB.
   */
  readonly lobOverride?: 'dental' | 'cosmetic';
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

export function useExport({ type, filters, lobOverride }: UseExportOptions): UseExportResult {
  const { t } = useTranslation('exports');
  const { currentLOB: activeLOB } = useBusinessUnit();
  const currentLOB = lobOverride ?? activeLOB;
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

    previewExport(type, filters, currentLOB)
      .then((data) => {
        setPreviewData(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t('previewError'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [type, filters, currentLOB]);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setError(null);
  }, []);

  const performDownload = useCallback(async () => {
    const blob = await downloadExport(type, filters, currentLOB);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = previewData?.filename || `${type}_export.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [type, filters, previewData, currentLOB]);

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

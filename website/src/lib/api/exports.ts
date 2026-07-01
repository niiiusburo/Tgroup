/**
 * @crossref:domain[reports-analytics]
 * @crossref:used-in[Exports API client; website/src/components/shared/ExportPreviewModal.tsx, website/src/hooks/useExport.ts]
 * @crossref:uses[website/src/lib/api/core.ts, api/src/routes/exports.js, product-map/domains/reports-analytics.yaml]
 * Calls /api/Exports/:type preview/download/types; download uses apiFetch with responseType:'blob'.
 */
import { apiFetch } from './core';

export interface ExportPreviewResponse {
  type: string;
  label: string;
  rowCount: number;
  filename: string;
  filters: Record<string, unknown>;
  summary: Array<{ label: string; value: string | number }>;
  exceedsMax: boolean;
}

export interface ExportTypeInfo {
  key: string;
  label: string;
  permission: string;
}

export async function previewExport(
  type: string,
  filters: Record<string, unknown>,
  lob?: 'dental' | 'cosmetic'
): Promise<ExportPreviewResponse> {
  return apiFetch(`/Exports/${type}/preview`, {
    method: 'POST',
    body: { filters },
    lob,
  });
}

export async function downloadExport(
  type: string,
  filters: Record<string, unknown>,
  lob?: 'dental' | 'cosmetic'
): Promise<Blob> {
  return apiFetch<Blob>(`/Exports/${type}/download`, {
    method: 'POST',
    body: { filters },
    lob,
    responseType: 'blob',
  });
}

export async function fetchExportTypes(): Promise<ExportTypeInfo[]> {
  return apiFetch('/Exports/types');
}
